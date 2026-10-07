package session

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

const lifebarText = "[Info]\nname = Default\n\n[P1 Life Bar]\npos = 6,17\n"

func writeFile(t *testing.T, name, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestOpen_ValidLifebar_LoadsTextAndIsClean(t *testing.T) {
	path := writeFile(t, "fight.def", lifebarText)

	s, err := Open(path)

	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if s.Path() != path {
		t.Errorf("Path = %q, want %q", s.Path(), path)
	}
	if s.Text() != lifebarText {
		t.Errorf("Text = %q, want %q", s.Text(), lifebarText)
	}
	if s.Dirty() {
		t.Error("a freshly opened session must not be dirty")
	}
}

func TestOpen_CommentsAreDroppedButNotCountedAsEdits(t *testing.T) {
	path := writeFile(t, "fight.def", "; header comment\n[Info]\nname = Default ; trailing\n")

	s, err := Open(path)

	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if s.Dirty() {
		t.Error("removing comments on load is canonicalization, not a user edit")
	}
}

func TestOpen_Errors_ForEmptyCommentOnlyNonLifebarAndMalformedFiles(t *testing.T) {
	cases := map[string]string{
		"empty file":              "",
		"comment-only file":       "; nothing here\n",
		"no sections at all":      "name = orphan\n",
		"malformed section":       "[Info\nname = x\n",
		"content before a header": "name = x\n[Info]\n",
	}
	for name, content := range cases {
		t.Run(name, func(t *testing.T) {
			path := writeFile(t, "bad.def", content)

			s, err := Open(path)

			if err == nil {
				t.Fatalf("expected an error, got session %v", s)
			}
			if s != nil {
				t.Error("a failed open must not return a session")
			}
		})
	}
}

func TestOpen_MissingFile_ReturnsErrorNamingTheFile(t *testing.T) {
	_, err := Open(filepath.Join(t.TempDir(), "gone.def"))

	if err == nil || !strings.Contains(err.Error(), "gone.def") {
		t.Errorf("error = %v, want one naming gone.def", err)
	}
}

func TestSetText_ValidEdit_MarksDirty(t *testing.T) {
	s := openSession(t, lifebarText)

	if err := s.SetText("[Info]\nname = Renamed\n"); err != nil {
		t.Fatalf("SetText: %v", err)
	}

	if !s.Dirty() {
		t.Error("an edit that changes the text must mark the session dirty")
	}
}

func TestSetText_EditedBackToOriginal_ClearsDirty(t *testing.T) {
	s := openSession(t, lifebarText)
	if err := s.SetText("[Info]\nname = Renamed\n"); err != nil {
		t.Fatal(err)
	}

	// Reverting to the saved text must clear dirty without any extra bookkeeping.
	if err := s.SetText(lifebarText); err != nil {
		t.Fatal(err)
	}
	if s.Dirty() {
		t.Error("reverting every change must clear the dirty state")
	}
}

func TestSetText_InvalidText_RejectedAndPreviousContentKept(t *testing.T) {
	s := openSession(t, lifebarText)

	err := s.SetText("[Info\nbroken")

	if err == nil {
		t.Fatal("expected SetText to reject malformed text")
	}
	if s.Text() != lifebarText {
		t.Errorf("Text = %q after a rejected edit, want the previous content", s.Text())
	}
	if s.Dirty() {
		t.Error("a rejected edit must not mark the session dirty")
	}
}

func TestSave_WritesTextAndClearsDirty(t *testing.T) {
	path := writeFile(t, "fight.def", lifebarText)
	s, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.SetText("[Info]\nname = Renamed\n"); err != nil {
		t.Fatal(err)
	}

	if err := s.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "[Info]\nname = Renamed\n" {
		t.Errorf("file on disk = %q", string(data))
	}
	if s.Dirty() {
		t.Error("a successful save must clear the dirty state")
	}
}

func TestSave_ReopenedFileRoundTripsWithoutDataLoss(t *testing.T) {
	path := writeFile(t, "fight.def", lifebarText)
	s, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Save(); err != nil {
		t.Fatal(err)
	}

	reopened, err := Open(path)

	if err != nil {
		t.Fatalf("reopen after save: %v", err)
	}
	if reopened.Text() != lifebarText {
		t.Errorf("reopened Text = %q, want %q", reopened.Text(), lifebarText)
	}
}

func TestSave_FailureLeavesOriginalAndEditsIntact(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("directory permissions are not enforced on Windows")
	}
	dir := t.TempDir()
	path := filepath.Join(dir, "fight.def")
	if err := os.WriteFile(path, []byte(lifebarText), 0o644); err != nil {
		t.Fatal(err)
	}
	s, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.SetText("[Info]\nname = Renamed\n"); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(dir, 0o555); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chmod(dir, 0o755) })

	err = s.Save()

	if err == nil {
		t.Skip("directory is still writable (running as root?)")
	}
	data, readErr := os.ReadFile(path)
	if readErr != nil || string(data) != lifebarText {
		t.Errorf("original file changed after a failed save: %q (%v)", string(data), readErr)
	}
	if !s.Dirty() || s.Text() != "[Info]\nname = Renamed\n" {
		t.Error("a failed save must keep the user's edits and dirty state")
	}
}

func openSession(t *testing.T, text string) *Session {
	t.Helper()
	s, err := Open(writeFile(t, "fight.def", text))
	if err != nil {
		t.Fatal(err)
	}
	return s
}
