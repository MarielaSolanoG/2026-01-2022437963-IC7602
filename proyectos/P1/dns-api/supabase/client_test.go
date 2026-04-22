package supabase

import (
	"os"
	"testing"

	"github.com/joho/godotenv"
)

func init() {
	// Carga el .env desde la raíz del proyecto
	godotenv.Load("../.env")
}

func TestGetRecord_Exists(t *testing.T) {
	os.Setenv("SUPABASE_URL", os.Getenv("SUPABASE_URL"))
	os.Setenv("SUPABASE_KEY", os.Getenv("SUPABASE_KEY"))

	exists, record, err := GetRecord("test.com")

	if err != nil {
		t.Errorf("no se esperaba un error: %v", err)
	}
	if !exists {
		t.Errorf("se esperaba que test.com existiera")
	}
	if record.Domain != "test.com" {
		t.Errorf("se esperaba domain=test.com, se obtuvo %s", record.Domain)
	}
}

func TestGetRecord_NotExists(t *testing.T) {
	exists, record, err := GetRecord("dominio-que-no-existe.com")

	if err != nil {
		t.Errorf("no se esperaba un error: %v", err)
	}
	if exists {
		t.Errorf("no se esperaba que el dominio existiera")
	}
	if record != nil {
		t.Errorf("se esperaba record=nil")
	}
}