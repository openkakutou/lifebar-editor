// Package ui is the Fyne front end of the desktop editor.
package ui

import (
	"fmt"
	"path/filepath"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/storage"
	"fyne.io/fyne/v2/widget"

	"github.com/openkakutou/lifebar-editor/desktop/internal/session"
)

const AppTitle = "Lifebar Editor"

// Editor is the main window content: open a lifebar, edit its text, save.
type Editor struct {
	win        fyne.Window
	sess       *session.Session
	textEntry  *widget.Entry
	status     *widget.Label
	saveButton *widget.Button
	// editError is the parse error for the text currently in the text area,
	// or "" when it is valid. A non-empty value blocks Save.
	editError string
	content   fyne.CanvasObject
}

// New builds the editor window content. Open shows a native file picker.
func New(win fyne.Window) *Editor {
	e := &Editor{
		win:       win,
		textEntry: widget.NewMultiLineEntry(),
		status:    widget.NewLabel("Open a lifebar .def file to start."),
	}
	e.textEntry.Disable()
	e.textEntry.OnChanged = e.onTextChanged
	e.saveButton = widget.NewButton("Save", e.save)
	e.saveButton.Disable()

	toolbar := container.NewHBox(widget.NewButton("Open…", e.openDialog), e.saveButton)
	e.content = container.NewBorder(toolbar, e.status, nil, nil, e.textEntry)

	win.Canvas().AddShortcut(&desktop.CustomShortcut{KeyName: fyne.KeyO, Modifier: fyne.KeyModifierShortcutDefault},
		func(fyne.Shortcut) { e.openDialog() })
	win.Canvas().AddShortcut(&desktop.CustomShortcut{KeyName: fyne.KeyS, Modifier: fyne.KeyModifierShortcutDefault},
		func(fyne.Shortcut) { e.save() })
	return e
}

// Content is the widget tree to set on the window.
func (e *Editor) Content() fyne.CanvasObject { return e.content }

// Load opens the lifebar at path. A failure is reported in the status line and
// leaves the currently open lifebar, its edits and its Save state untouched.
func (e *Editor) Load(path string) {
	s, err := session.Open(path)
	if err != nil {
		e.status.SetText("Cannot open lifebar: " + err.Error())
		return
	}
	e.sess = s
	e.editError = ""
	e.textEntry.Enable()
	e.textEntry.SetText(s.Text())
	e.status.SetText("Opened " + filepath.Base(path))
	e.refresh()
}

func (e *Editor) openDialog() {
	d := dialog.NewFileOpen(e.handleOpen, e.win)
	d.SetFilter(storage.NewExtensionFileFilter([]string{".def"}))
	d.Show()
}

// handleOpen receives the file picker's result. A cancelled picker (no error,
// no file) changes nothing.
func (e *Editor) handleOpen(r fyne.URIReadCloser, err error) {
	if err != nil {
		e.status.SetText("Cannot open lifebar: " + err.Error())
		return
	}
	if r == nil {
		return
	}
	r.Close()
	e.Load(r.URI().Path())
}

func (e *Editor) onTextChanged(text string) {
	if e.sess == nil {
		return
	}
	if err := e.sess.SetText(text); err != nil {
		e.editError = err.Error()
		e.status.SetText("Fix this before saving: " + e.editError)
		e.refresh()
		return
	}
	e.editError = ""
	if e.sess.Dirty() {
		e.status.SetText("Unsaved changes")
	}
	e.refresh()
}

func (e *Editor) save() {
	if e.sess == nil {
		return
	}
	if e.editError != "" {
		e.status.SetText("Fix this before saving: " + e.editError)
		return
	}
	if err := e.sess.Save(); err != nil {
		e.status.SetText("Save failed: " + err.Error() + ". Your edits are still here.")
		e.refresh()
		return
	}
	e.status.SetText("Saved " + filepath.Base(e.sess.Path()))
	e.refresh()
}

// refresh syncs the Save button and the window title with the unsaved state.
func (e *Editor) refresh() {
	if e.sess == nil {
		e.saveButton.Disable()
		e.win.SetTitle(AppTitle)
		return
	}
	name := filepath.Base(e.sess.Path())
	if e.sess.Dirty() {
		e.win.SetTitle(fmt.Sprintf("%s - %s *", AppTitle, name))
	} else {
		e.win.SetTitle(fmt.Sprintf("%s - %s", AppTitle, name))
	}
	if e.sess.Dirty() && e.editError == "" {
		e.saveButton.Enable()
	} else {
		e.saveButton.Disable()
	}
}
