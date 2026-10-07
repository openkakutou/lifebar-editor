package lifebar

import (
	"os"
	"reflect"
	"testing"
)

func TestSerialize_WritesHeadersEntriesAndBlankLineBetweenSections(t *testing.T) {
	doc := Document{Sections: []Section{
		{Name: "Info", Entries: []Entry{{Key: "name", Value: "Default"}}},
		{Name: "Life Bar 0", Entries: []Entry{{Key: "pos", Value: "6,17"}, {Key: "range.x", Value: "0, 158"}}},
	}}

	got := Serialize(doc)

	want := "[Info]\nname = Default\n\n[Life Bar 0]\npos = 6,17\nrange.x = 0, 158\n"
	if got != want {
		t.Errorf("Serialize =\n%q\nwant\n%q", got, want)
	}
}

func TestSerialize_EmptyDocument_ReturnsEmptyString(t *testing.T) {
	if got := Serialize(Document{}); got != "" {
		t.Errorf("Serialize(empty) = %q, want empty string", got)
	}
}

func TestSerialize_SectionWithNoEntries_WritesHeaderOnly(t *testing.T) {
	got := Serialize(Document{Sections: []Section{{Name: "Empty"}}})

	if got != "[Empty]\n" {
		t.Errorf("Serialize = %q, want \"[Empty]\\n\"", got)
	}
}

func TestSerialize_DuplicateSectionsAndKeys_WrittenInOrderNotMerged(t *testing.T) {
	doc := Document{Sections: []Section{
		{Name: "Life Bar 0", Entries: []Entry{{Key: "pos", Value: "1,1"}, {Key: "pos", Value: "2,2"}}},
		{Name: "Life Bar 0", Entries: []Entry{{Key: "pos", Value: "3,3"}}},
	}}

	got := Serialize(doc)

	want := "[Life Bar 0]\npos = 1,1\npos = 2,2\n\n[Life Bar 0]\npos = 3,3\n"
	if got != want {
		t.Errorf("Serialize = %q, want %q", got, want)
	}
}

func TestSerialize_RoundTripOfRealFixture_IsSemanticallyEquivalent(t *testing.T) {
	data, err := os.ReadFile("testdata/fight.def")
	if err != nil {
		t.Fatal(err)
	}
	first := mustParse(t, string(data))

	second := mustParse(t, Serialize(first))

	if !reflect.DeepEqual(stripLines(first), stripLines(second)) {
		t.Error("re-parsing the serialized fixture changed its sections or entries")
	}
}

func TestSerialize_RoundTripOfRealFixture_IsStableAfterFirstSerialize(t *testing.T) {
	data, err := os.ReadFile("testdata/fight.def")
	if err != nil {
		t.Fatal(err)
	}
	once := Serialize(mustParse(t, string(data)))

	twice := Serialize(mustParse(t, once))

	if once != twice {
		t.Error("serializing twice must produce identical text")
	}
}

// stripLines drops source line numbers, which legitimately differ between
// the original file's layout and the serializer's canonical layout.
func stripLines(doc Document) Document {
	out := Document{}
	for _, s := range doc.Sections {
		sec := Section{Name: s.Name}
		for _, e := range s.Entries {
			sec.Entries = append(sec.Entries, Entry{Key: e.Key, Value: e.Value})
		}
		out.Sections = append(out.Sections, sec)
	}
	return out
}
