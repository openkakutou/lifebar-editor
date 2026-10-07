// Package session holds the editor's open lifebar, independent of any GUI
// toolkit so it can be tested without a display.
package session

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/openkakutou/lifebar-editor/desktop/internal/lifebar"
)

// Session is one lifebar .def file opened for editing. Its text is always the
// canonical serialization of a document that parsed successfully, so the
// session can never hold content that would fail to reload.
type Session struct {
	path  string
	doc   lifebar.Document
	saved string
}

// Open loads the lifebar .def file at path. An unreadable file, an empty file,
// a file with no sections, or a malformed one is an error.
func Open(path string) (*Session, error) {
	name := filepath.Base(path)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", name, err)
	}
	if len(data) == 0 {
		return nil, fmt.Errorf("%s is empty", name)
	}
	doc, err := lifebar.Parse(string(data))
	if err != nil {
		return nil, fmt.Errorf("parsing %s: %w", name, err)
	}
	if len(doc.Sections) == 0 {
		return nil, fmt.Errorf("%s is not a lifebar .def file: it has no [Section] headers", name)
	}
	text := lifebar.Serialize(doc)
	return &Session{path: path, doc: doc, saved: text}, nil
}

// Path is the file the lifebar was opened from.
func (s *Session) Path() string { return s.path }

// Text is the lifebar's canonical .def text, as it would be saved.
func (s *Session) Text() string { return lifebar.Serialize(s.doc) }

// Dirty reports whether the text differs from what was last read or written.
func (s *Session) Dirty() bool { return s.Text() != s.saved }

// SetText replaces the document with the parsed form of text. Text that does
// not parse is rejected and leaves the session unchanged.
func (s *Session) SetText(text string) error {
	doc, err := lifebar.Parse(text)
	if err != nil {
		return err
	}
	s.doc = doc
	return nil
}

// Save writes the canonical text back to the file. The write goes through a
// temp file in the same directory so a failure never truncates the original.
func (s *Session) Save() error {
	name := filepath.Base(s.path)
	text := s.Text()
	tmp, err := os.CreateTemp(filepath.Dir(s.path), ".save-*.def")
	if err != nil {
		return fmt.Errorf("saving %s: %w", name, err)
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.WriteString(text); err != nil {
		tmp.Close()
		return fmt.Errorf("saving %s: %w", name, err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("saving %s: %w", name, err)
	}
	if err := os.Rename(tmp.Name(), s.path); err != nil {
		return fmt.Errorf("saving %s: %w", name, err)
	}
	s.saved = text
	return nil
}
