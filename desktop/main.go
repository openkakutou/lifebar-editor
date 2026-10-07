// Command lifebar-editor-desktop is the native Fyne build of the lifebar editor.
package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"

	"github.com/openkakutou/lifebar-editor/desktop/internal/ui"
)

func main() {
	a := app.New()
	win := a.NewWindow(ui.AppTitle)
	editor := ui.New(win)
	win.SetContent(editor.Content())
	win.Resize(fyne.NewSize(640, 480))
	win.ShowAndRun()
}
