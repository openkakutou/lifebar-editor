package ui

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/test"
)

const validText = "[Info]\nname = Default\n\n[P1 Life Bar]\npos = 6,17\n"

func writeDef(t *testing.T, name, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func newEditor(t *testing.T) (*Editor, fyne.Window) {
	t.Helper()
	win := test.NewApp().NewWindow("t")
	return New(win), win
}

// typeText simulates the user editing the text area: the widget's text
// changes and its change handler runs, as Fyne does for real keystrokes.
func typeText(e *Editor, text string) {
	e.textEntry.SetText(text)
	e.textEntry.OnChanged(text)
}

func TestEditor_InitialState_SaveDisabledAndOpenHintShown(t *testing.T) {
	e, _ := newEditor(t)

	if !e.saveButton.Disabled() {
		t.Error("save must be disabled before a lifebar is open")
	}
	if !strings.Contains(e.status.Text, "lifebar") {
		t.Errorf("expected a hint telling the user to open a lifebar .def, got %q", e.status.Text)
	}
}

func TestLoad_ValidFile_ShowsTextTitleAndStatusWithSaveDisabled(t *testing.T) {
	e, win := newEditor(t)
	path := writeDef(t, "fight.def", validText)

	e.Load(path)

	if e.textEntry.Text != validText {
		t.Errorf("text area = %q, want the file's text", e.textEntry.Text)
	}
	if win.Title() != "Lifebar Editor - fight.def" {
		t.Errorf("title = %q", win.Title())
	}
	if !strings.Contains(e.status.Text, "Opened fight.def") {
		t.Errorf("status = %q, want confirmation of the load", e.status.Text)
	}
	if !e.saveButton.Disabled() {
		t.Error("save must be disabled right after a load, with no edits")
	}
}

func TestLoad_NonLifebarFile_ShowsErrorAndKeepsPreviousDocument(t *testing.T) {
	e, win := newEditor(t)
	e.Load(writeDef(t, "fight.def", validText))

	e.Load(writeDef(t, "notes.txt", "[Broken\n"))

	if !strings.HasPrefix(e.status.Text, "Cannot open lifebar") {
		t.Errorf("status = %q, want an error message", e.status.Text)
	}
	if e.textEntry.Text != validText {
		t.Errorf("text area changed after a failed open: %q", e.textEntry.Text)
	}
	if win.Title() != "Lifebar Editor - fight.def" {
		t.Errorf("title changed after a failed open: %q", win.Title())
	}
}

func TestEdit_ValidChange_MarksUnsavedAndEnablesSave(t *testing.T) {
	e, win := newEditor(t)
	e.Load(writeDef(t, "fight.def", validText))

	typeText(e, "[Info]\nname = Renamed\n")

	if e.saveButton.Disabled() {
		t.Error("save must be enabled after a valid edit")
	}
	if win.Title() != "Lifebar Editor - fight.def *" {
		t.Errorf("title = %q, want the unsaved marker", win.Title())
	}
	if e.status.Text != "Unsaved changes" {
		t.Errorf("status = %q", e.status.Text)
	}
}

func TestEdit_InvalidText_DisablesSaveAndExplainsWhy(t *testing.T) {
	e, _ := newEditor(t)
	e.Load(writeDef(t, "fight.def", validText))

	typeText(e, "[Info\nbroken")

	if !e.saveButton.Disabled() {
		t.Error("save must be disabled while the text is invalid")
	}
	if !strings.Contains(e.status.Text, "line 1") {
		t.Errorf("status = %q, want the parse error with its line", e.status.Text)
	}
}

func TestEdit_RevertedToSavedText_ClearsUnsavedState(t *testing.T) {
	e, win := newEditor(t)
	e.Load(writeDef(t, "fight.def", validText))
	typeText(e, "[Info]\nname = Renamed\n")

	typeText(e, validText)

	if !e.saveButton.Disabled() {
		t.Error("save must be disabled once the text is back to the saved content")
	}
	if win.Title() != "Lifebar Editor - fight.def" {
		t.Errorf("title = %q, want no unsaved marker", win.Title())
	}
}

func TestSave_WritesFileAndDisablesSaveAgain(t *testing.T) {
	e, win := newEditor(t)
	path := writeDef(t, "fight.def", validText)
	e.Load(path)
	typeText(e, "[Info]\nname = Renamed\n")

	e.save()

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "[Info]\nname = Renamed\n" {
		t.Errorf("file on disk = %q", string(data))
	}
	if !e.saveButton.Disabled() {
		t.Error("save must be disabled after a successful save")
	}
	if win.Title() != "Lifebar Editor - fight.def" {
		t.Errorf("title = %q, want no unsaved marker", win.Title())
	}
}

func TestSave_InvalidText_DoesNotWriteFile(t *testing.T) {
	e, _ := newEditor(t)
	path := writeDef(t, "fight.def", validText)
	e.Load(path)
	typeText(e, "[Info\nbroken")

	e.save()

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != validText {
		t.Errorf("an invalid edit must never reach the file, got %q", string(data))
	}
}

func TestHandleOpen_CancelledDialog_LeavesStateUntouched(t *testing.T) {
	e, win := newEditor(t)
	e.Load(writeDef(t, "fight.def", validText))
	before := e.status.Text

	e.handleOpen(nil, nil)

	if e.status.Text != before {
		t.Errorf("status changed on a cancelled dialog: %q", e.status.Text)
	}
	if e.textEntry.Text != validText {
		t.Error("text area changed on a cancelled dialog")
	}
	if win.Title() != "Lifebar Editor - fight.def" {
		t.Errorf("title changed on a cancelled dialog: %q", win.Title())
	}
}

func TestHandleOpen_DialogError_ShowsErrorAndKeepsDocument(t *testing.T) {
	e, _ := newEditor(t)
	e.Load(writeDef(t, "fight.def", validText))

	e.handleOpen(nil, errors.New("permission denied"))

	if !strings.Contains(e.status.Text, "permission denied") {
		t.Errorf("status = %q, want the dialog error", e.status.Text)
	}
	if e.textEntry.Text != validText {
		t.Error("text area changed after a dialog error")
	}
}

func TestLoad_Directory_ShowsErrorInsteadOfCrashing(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("reading a directory behaves differently on Windows")
	}
	e, _ := newEditor(t)

	e.Load(t.TempDir())

	if !strings.HasPrefix(e.status.Text, "Cannot open lifebar") {
		t.Errorf("status = %q, want an error for a directory", e.status.Text)
	}
}
