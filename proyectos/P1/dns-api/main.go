package main

import (
	"dns-api/dns"
	"dns-api/supabase"
	"encoding/base64"
	"log"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	log.Println("Supabase URL:", os.Getenv("SUPABASE_URL"))
	log.Println("DNS Server:", os.Getenv("DNS_REMOTE_SERVER"))

	r := gin.Default()

	// CORS — permite que la UI en :5173 llame al API en :8080
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Verifica si un dominio existe en Supabase
	// client_ip sirve para registros geo y round-trip.
	r.GET("/api/exists", func(c *gin.Context) {
		domain := c.Query("domain")
		clientIP := c.Query("client_ip")

		if domain == "" {
			c.JSON(400, gin.H{"error": "falta el parámetro domain"})
			return
		}

		result, err := supabase.ResolveRecord(domain, clientIP)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, result)
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


	// GET /api/records — lista todos los registros
	r.GET("/api/records", func(c *gin.Context) {
		records, err := supabase.GetAllRecords()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, records)
	})

	// POST /api/records — crea un registro
	r.POST("/api/records", func(c *gin.Context) {
		var record supabase.DnsRecord
		if err := c.ShouldBindJSON(&record); err != nil {
			c.JSON(400, gin.H{"error": "body inválido: " + err.Error()})
			return
		}
		created, err := supabase.CreateRecord(record)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(201, created)
	})

	// PUT /api/records/:id — actualiza un registro
	r.PUT("/api/records/:id", func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "ID inválido"})
			return
		}
		var record supabase.DnsRecord
		if err := c.ShouldBindJSON(&record); err != nil {
			c.JSON(400, gin.H{"error": "body inválido: " + err.Error()})
			return
		}
		updated, err := supabase.UpdateRecord(id, record)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, updated)
	})

	// DELETE /api/records/:id — elimina un registro
	r.DELETE("/api/records/:id", func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "ID inválido"})
			return
		}
		if err := supabase.DeleteRecord(id); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"message": "registro eliminado"})
	})


// GET /api/ip-country — lista todos
r.GET("/api/ip-country", func(c *gin.Context) {
    records, err := supabase.GetAllIpCountry()
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    c.JSON(200, records)
})

// POST /api/ip-country — crea uno
r.POST("/api/ip-country", func(c *gin.Context) {
    var record supabase.IpCountry
    if err := c.ShouldBindJSON(&record); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    created, err := supabase.CreateIpCountry(record)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    c.JSON(201, created)
})

// PUT /api/ip-country/:id — actualiza uno
r.PUT("/api/ip-country/:id", func(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "ID inválido"})
        return
    }
    var record supabase.IpCountry
    if err := c.ShouldBindJSON(&record); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    updated, err := supabase.UpdateIpCountry(id, record)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    c.JSON(200, updated)
})

// DELETE /api/ip-country/:id — elimina uno
r.DELETE("/api/ip-country/:id", func(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "ID inválido"})
        return
    }
    if err := supabase.DeleteIpCountry(id); err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    c.JSON(200, gin.H{"message": "eliminado"})
})

r.PUT("/api/health-checks/:dns_record_id", func(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("dns_record_id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "ID inválido"})
        return
    }
    var hc supabase.HealthCheck
    if err := c.ShouldBindJSON(&hc); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    if err := supabase.UpdateHealthCheck(id, hc); err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    c.JSON(200, gin.H{"message": "health check actualizado"})
})

	r.Run(":8080")
}
