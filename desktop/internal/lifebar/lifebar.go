// Package lifebar parses and serializes MUGEN/Ikemen GO lifebar .def-style
// text. It is a Go port of the TypeScript parser in the web build
// (src/lifebar/parse.ts and serialize.ts): the same generic, unevaluated
// model, so any section or key this package does not interpret round-trips
// unchanged. It has no GUI dependency.
package lifebar

import (
	"fmt"
	"strings"
)

// Entry is one `key = value` line within a section, in original casing and
// unevaluated.
type Entry struct {
	Key   string
	Value string
	// Line is the 1-indexed source line the entry was read from.
	Line int
}

// Section is one `[Name]` block and its entries, in file order.
type Section struct {
	Name    string
	Entries []Entry
	// Line is the 1-indexed source line of the section header.
	Line int
}

// Document is a fully parsed lifebar file: every section, in file order.
// Sections and entries are slices, never maps, so a repeated name or key is
// kept rather than silently dropped.
type Document struct {
	Sections []Section
}

// SectionsNamed returns every section named name, matched case-insensitively,
// in file order.
func (d Document) SectionsNamed(name string) []Section {
	var out []Section
	for _, s := range d.Sections {
		if strings.EqualFold(s.Name, name) {
			out = append(out, s)
		}
	}
	return out
}

// EntriesNamed returns every entry keyed key within the section, matched
// case-insensitively, in file order.
func (s Section) EntriesNamed(key string) []Entry {
	var out []Entry
	for _, e := range s.Entries {
		if strings.EqualFold(e.Key, key) {
			out = append(out, e)
		}
	}
	return out
}

// Parse reads lifebar text into a Document. An empty, whitespace-only or
// comment-only input yields an empty Document, not an error. Any line that is
// not blank, a comment, a section header or a key = value pair is an error,
// reported with its line number.
func Parse(text string) (Document, error) {
	var doc Document
	current := -1
	for i, raw := range strings.Split(text, "\n") {
		lineNumber := i + 1
		line := stripComment(raw)
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "[") {
			name, err := parseHeader(line)
			if err != nil {
				return Document{}, fmt.Errorf("line %d: %w", lineNumber, err)
			}
			doc.Sections = append(doc.Sections, Section{Name: name, Line: lineNumber})
			current = len(doc.Sections) - 1
			continue
		}

		key, value, ok := splitKeyValue(line)
		if !ok {
			return Document{}, fmt.Errorf("line %d: expected a [Section Name] header or a key = value pair, found %q", lineNumber, line)
		}
		if current < 0 {
			return Document{}, fmt.Errorf("line %d: content appears before any [Section Name] header: %q", lineNumber, line)
		}
		doc.Sections[current].Entries = append(doc.Sections[current].Entries,
			Entry{Key: key, Value: value, Line: lineNumber})
	}
	return doc, nil
}

// Serialize writes doc as .def-style text: one header per section, its
// entries as key = value lines, sections separated by a blank line. Output
// follows array order exactly. An empty document serializes to "".
func Serialize(doc Document) string {
	if len(doc.Sections) == 0 {
		return ""
	}
	blocks := make([]string, 0, len(doc.Sections))
	for _, s := range doc.Sections {
		var b strings.Builder
		b.WriteString("[" + s.Name + "]")
		for _, e := range s.Entries {
			b.WriteString("\n" + e.Key + " = " + e.Value)
		}
		blocks = append(blocks, b.String())
	}
	return strings.Join(blocks, "\n\n") + "\n"
}

// stripComment drops a ';' comment (whole-line or trailing) and surrounding
// whitespace.
func stripComment(raw string) string {
	if i := strings.IndexByte(raw, ';'); i >= 0 {
		raw = raw[:i]
	}
	return strings.TrimSpace(raw)
}

// parseHeader accepts exactly one "[...]" group spanning the whole line.
func parseHeader(line string) (string, error) {
	end := strings.IndexByte(line, ']')
	if end != len(line)-1 {
		return "", fmt.Errorf("malformed section header (missing closing \"]\" or trailing text): %q", line)
	}
	return strings.TrimSpace(line[1:end]), nil
}

// splitKeyValue splits at the first '='. The key must be non-empty.
func splitKeyValue(line string) (key, value string, ok bool) {
	i := strings.IndexByte(line, '=')
	if i < 0 {
		return "", "", false
	}
	key = strings.TrimSpace(line[:i])
	if key == "" {
		return "", "", false
	}
	return key, strings.TrimSpace(line[i+1:]), true
}
