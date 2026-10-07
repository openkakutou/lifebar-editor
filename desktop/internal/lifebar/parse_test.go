package lifebar

import (
	"os"
	"reflect"
	"strings"
	"testing"
)

func mustParse(t *testing.T, text string) Document {
	t.Helper()
	doc, err := Parse(text)
	if err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	return doc
}

func TestParse_WellFormedFile_SectionsAndEntriesInFileOrder(t *testing.T) {
	text := "[Info]\nname = Default\nauthor = Elecbyte\n\n[Life Bar 0]\npos = 6,17\nrange.x = 0, 158\n"

	doc := mustParse(t, text)

	if got := sectionNames(doc); !reflect.DeepEqual(got, []string{"Info", "Life Bar 0"}) {
		t.Fatalf("section names = %v", got)
	}
	want := []Entry{{Key: "name", Value: "Default", Line: 2}, {Key: "author", Value: "Elecbyte", Line: 3}}
	if !reflect.DeepEqual(doc.Sections[0].Entries, want) {
		t.Errorf("Info entries = %+v, want %+v", doc.Sections[0].Entries, want)
	}
	if doc.Sections[1].Line != 5 {
		t.Errorf("Life Bar 0 header line = %d, want 5", doc.Sections[1].Line)
	}
}

func TestParse_StripsWholeLineAndTrailingComments_SkipsBlankLines(t *testing.T) {
	text := "; a whole-line comment\n[Round]\npos = 160,80 ; trailing comment\n\n  \n"

	doc := mustParse(t, text)

	want := []Entry{{Key: "pos", Value: "160,80", Line: 3}}
	if !reflect.DeepEqual(doc.Sections[0].Entries, want) {
		t.Errorf("entries = %+v, want %+v", doc.Sections[0].Entries, want)
	}
}

func TestParse_EmptyInput_ReturnsEmptyDocumentNotError(t *testing.T) {
	doc := mustParse(t, "")

	if len(doc.Sections) != 0 {
		t.Errorf("sections = %d, want 0", len(doc.Sections))
	}
}

func TestParse_CRLFLineEndings_ParsedLikeLF(t *testing.T) {
	doc := mustParse(t, "[Info]\r\nname = Kyo\r\n")

	if got := doc.Sections[0].Entries[0]; got.Key != "name" || got.Value != "Kyo" {
		t.Errorf("entry = %+v, want name=Kyo", got)
	}
}

func TestParse_ValueContainingEquals_KeepsEverythingAfterFirstEquals(t *testing.T) {
	doc := mustParse(t, "[Info]\nformula = a = b\n")

	got := doc.Sections[0].Entries[0]
	if got.Key != "formula" || got.Value != "a = b" {
		t.Errorf("entry = %+v, want formula / a = b", got)
	}
}

func TestParse_DuplicateSectionNamesAndKeys_KeptAsSeparateItems(t *testing.T) {
	text := "[Life Bar 0]\npos = 1,1\npos = 2,2\n\n[Life Bar 0]\npos = 3,3\n"

	doc := mustParse(t, text)

	if len(doc.Sections) != 2 {
		t.Fatalf("sections = %d, want 2", len(doc.Sections))
	}
	if len(doc.Sections[0].Entries) != 2 {
		t.Errorf("first section entries = %d, want 2", len(doc.Sections[0].Entries))
	}
}

func TestParse_UnrecognizedIkemenSectionAndKey_Retained(t *testing.T) {
	doc := mustParse(t, "[Ikemen Extra]\nnewkey = 7\n")

	if got := doc.Sections[0]; got.Name != "Ikemen Extra" || got.Entries[0].Key != "newkey" {
		t.Errorf("section = %+v, want the unknown section and key retained", got)
	}
}

func TestParse_MalformedErrors_CarryLineNumber(t *testing.T) {
	cases := map[string]struct {
		text string
		line string
	}{
		"header missing closing bracket": {"[Info\nname = x\n", "line 1"},
		"header with trailing junk":      {"[Info] junk\n", "line 1"},
		"content before any header":      {"name = x\n", "line 1"},
		"line with no equals sign":       {"[Info]\nnot a pair\n", "line 2"},
		"empty key":                      {"[Info]\n = value\n", "line 2"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := Parse(tc.text)
			if err == nil {
				t.Fatal("expected an error")
			}
			if !strings.Contains(err.Error(), tc.line) {
				t.Errorf("error %q does not mention %q", err, tc.line)
			}
		})
	}
}

func TestParse_RealFixture_ParsesCompletely(t *testing.T) {
	data, err := os.ReadFile("testdata/fight.def")
	if err != nil {
		t.Fatal(err)
	}

	doc := mustParse(t, string(data))

	if len(doc.SectionsNamed("p1 life bar")) != 1 {
		t.Errorf("expected exactly one P1 Life Bar section (case-insensitive), sections = %v", sectionNames(doc))
	}
}

func TestSectionsNamed_IsCaseInsensitiveAndKeepsOrder(t *testing.T) {
	doc := mustParse(t, "[Bar]\na = 1\n\n[bar]\na = 2\n\n[Other]\n")

	got := doc.SectionsNamed("BAR")

	if len(got) != 2 || got[0].Entries[0].Value != "1" || got[1].Entries[0].Value != "2" {
		t.Errorf("SectionsNamed = %+v, want both bar sections in file order", got)
	}
}

func TestEntriesNamed_IsCaseInsensitiveAndKeepsOrder(t *testing.T) {
	doc := mustParse(t, "[Bar]\nPos = 1\nother = x\npos = 2\n")

	got := doc.Sections[0].EntriesNamed("POS")

	if len(got) != 2 || got[0].Value != "1" || got[1].Value != "2" {
		t.Errorf("EntriesNamed = %+v, want both pos entries in file order", got)
	}
}

func sectionNames(doc Document) []string {
	names := make([]string, 0, len(doc.Sections))
	for _, s := range doc.Sections {
		names = append(names, s.Name)
	}
	return names
}
