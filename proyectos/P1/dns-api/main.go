package main

import (
	"dns-api/dns"
	"dns-api/supabase"
	"encoding/base64"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	log.Println("Supabase URL:", os.Getenv("SUPABASE_URL"))
	log.Println("DNS Server:", os.Getenv("DNS_REMOTE_SERVER"))

	r := gin.Default()

	// Verifica si un dominio existe en Supabase
	r.GET("/api/exists", func(c *gin.Context) {
		domain := c.Query("domain")
		if domain == "" {
			c.JSON(400, gin.H{"error": "falta el parámetro domain"})
			return
		}

		exists, record, err := supabase.GetRecord(domain)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, gin.H{
			"exists": exists,
			"record": record,
		})
	})

	// Recibe un paquete DNS en BASE64, lo reenvía al DNS remoto y devuelve la respuesta en BASE64
	r.POST("/api/dns_resolver", func(c *gin.Context) {
		var body struct {
			Data string `json:"data"`
		}

		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": "body inválido"})
			return
		}

		// Decodifica el paquete DNS de BASE64 a bytes
		packet, err := base64.StdEncoding.DecodeString(body.Data)
		if err != nil {
			c.JSON(400, gin.H{"error": "BASE64 inválido"})
			return
		}

		// Reenvía el paquete al servidor DNS remoto por UDP
		response, err := dns.ForwardQuery(packet, os.Getenv("DNS_REMOTE_SERVER"))
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		// Devuelve la respuesta codificada en BASE64
		c.JSON(200, gin.H{
			"data": base64.StdEncoding.EncodeToString(response),
		})
	})

	r.Run(":8080")
}
