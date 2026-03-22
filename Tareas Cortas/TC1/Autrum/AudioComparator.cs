using System;
using System.Linq;

namespace Autrum
{
    public class ComparisonResult
    {
        public float SimilarityScore { get; set; } // 0-100
        public float HarmonicScore { get; set; }
        public float PowerScore { get; set; }
        public float TimeFoundSeconds { get; set; } // -1 si no se encontró coincidencia temporal
    }

    public class AudioComparator
    {
        /// <summary>
        /// COMPARACIÓN DE AUDIO - CÁLCULO DE CONFIANZA:
        /// 
        /// La "confianza" o puntuación de similitud (0-100%) se calcula combinando dos métricas:
        /// 
        /// 1. SIMILITUD ARMÓNICA (60% del peso):
        ///    - Mide qué tan similares son las magnitudes de las frecuencias
        ///    - Usa correlación espectral (producto punto normalizado)
        ///    - Resultado: 0-100% (100% = mismo contenido frecuencial)
        ///    - Fórmula: correlación = (∑esp1·esp2) / (|esp1| × |esp2|)
        /// 
        /// 2. SIMILITUD DE POTENCIA (40% del peso):
        ///    - Mide cuánta energía tiene cada audio
        ///    - Compara la raíz cuadrada de la suma de magnitudes al cuadrado (RMS)
        ///    - Resultado: 0-100% (100% = misma energía/volumen)
        ///    - Fórmula: potencia = min(RMS1/RMS2, RMS2/RMS1)
        /// 
        /// PUNTUACIÓN FINAL: (SimilitudArmónica × 0.6) + (SimilitudPotencia × 0.4)
        /// 
        /// BÚSQUEDA TEMPORAL (en CompareWithTimeSearch):
        ///    - Desliza una ventana sobre el audio de referencia (grabación 1)
        ///    - Busca dónde aparece la mejor coincidencia con el audio de prueba (grabación 2)
        ///    - Reporta el tiempo exacto en segundos donde se encontró la coincidencia
        ///    - Si no hay coincidencia clara, devuelve -1
        /// </summary>
        public ComparisonResult Compare(SpectrumData spectrum1, SpectrumData spectrum2)
        {
            if (spectrum1.Magnitudes.Length == 0 || spectrum2.Magnitudes.Length == 0)
                return new ComparisonResult { SimilarityScore = 0 };

            // Normalizar espectros
            float[] norm1 = NormalizeSpectrum(spectrum1.Magnitudes);
            float[] norm2 = NormalizeSpectrum(spectrum2.Magnitudes);

            // Asegurar mismo tamaño
            int minLength = Math.Min(norm1.Length, norm2.Length);
            Array.Resize(ref norm1, minLength);
            Array.Resize(ref norm2, minLength);

            // Calcular similitud armónica (correlación espectral)
            float harmonicScore = CalculateSpectralCorrelation(norm1, norm2) * 100;

            // Calcular similitud de potencia (RMS)
            float powerScore = CalculatePowerSimilarity(norm1, norm2) * 100;

            // Puntuación final: 60% armónica, 40% potencia
            float finalScore = harmonicScore * 0.6f + powerScore * 0.4f;

            return new ComparisonResult
            {
                SimilarityScore = Math.Min(100, Math.Max(0, finalScore)),
                HarmonicScore = harmonicScore,
                PowerScore = powerScore
            };
        }

        private float[] NormalizeSpectrum(float[] spectrum)
        {
            float max = spectrum.Max();
            if (max <= 0) return spectrum;
            return spectrum.Select(x => x / max).ToArray();
        }

        private float CalculateSpectralCorrelation(float[] spec1, float[] spec2)
        {
            float dotProduct = 0;
            float magnitude1 = 0;
            float magnitude2 = 0;

            for (int i = 0; i < spec1.Length; i++)
            {
                dotProduct += spec1[i] * spec2[i];
                magnitude1 += spec1[i] * spec1[i];
                magnitude2 += spec2[i] * spec2[i];
            }

            magnitude1 = (float)Math.Sqrt(magnitude1);
            magnitude2 = (float)Math.Sqrt(magnitude2);

            if (magnitude1 == 0 || magnitude2 == 0)
                return 0;

            return Math.Abs(dotProduct / (magnitude1 * magnitude2));
        }

        private float CalculatePowerSimilarity(float[] spec1, float[] spec2)
        {
            float power1 = spec1.Sum(x => x * x);
            float power2 = spec2.Sum(x => x * x);

            if (power1 == 0 || power2 == 0)
                return 0;

            float ratio = power1 / power2;
            return Math.Min(ratio, 1 / ratio);
        }

        /// <summary>
        /// BÚSQUEDA TEMPORAL DE COINCIDENCIA:
        /// 
        /// Busca en dónde del audio de REFERENCIA (grabación 1) ocurre la mayor similitud con el audio de PRUEBA (grabación 2).
        /// 
        /// METODOLOGÍA DE MEDICIÓN:
        /// - Se normaliza el espectro de prueba dividiendo por su valor máximo
        /// - Se desliza una ventana (window) sobre el espectro de referencia
        /// - Para cada posición, se calcula la similitud usando los mismos criterios:
        ///   * Correlación armónica (60% peso)
        ///   * Similitud de potencia (40% peso)
        /// - Se guarda la posición con la puntuación más alta
        /// - Se convierte el índice espectral a segundos: tiempo = (índice × windowSize) / sampleRate
        /// 
        /// RESULTADO:
        /// - Devuelve la confianza (SimilarityScore) en el mejor punto encontrado
        /// - Devuelve el tiempo exacto en segundos donde ocurrió
        /// - Si no se encuentra coincidencia, TimeFoundSeconds = -1
        /// 
        /// PARÁMETROS:
        /// - referenceSpectrum: Conjunto de espectros de la grabación 1
        /// - testSpectrum: Espectro de la grabación 2
        /// - sampleRate: Frecuencia de muestreo (44,100 Hz por defecto)
        /// - windowSize: Tamaño de la ventana FFT (2048 por defecto)
        /// </summary>
        public ComparisonResult CompareWithTimeSearch(SpectrumData referenceSpectrum, SpectrumData testSpectrum, 
                                                      float sampleRate = 44100f, int windowSize = 2048)
        {
            if (referenceSpectrum.Magnitudes.Length == 0 || testSpectrum.Magnitudes.Length == 0)
                return new ComparisonResult { SimilarityScore = 0, TimeFoundSeconds = -1 };

            // Normalizar el espectro de prueba
            float[] normTest = NormalizeSpectrum(testSpectrum.Magnitudes);

            float bestScore = -1;
            float bestTimeSeconds = -1;
            float bestHarmonicScore = 0;
            float bestPowerScore = 0;

            // Deslizar ventana sobre el espectro de referencia
            int windowCount = Math.Max(1, referenceSpectrum.Magnitudes.Length - normTest.Length);
            
            for (int offset = 0; offset < windowCount; offset++)
            {
                // Extraer ventana de referencias magnitudes
                float[] windowRef = new float[normTest.Length];
                Array.Copy(referenceSpectrum.Magnitudes, offset, windowRef, 0, normTest.Length);
                
                // Normalizar ventana
                float[] normRef = NormalizeSpectrum(windowRef);

                // Comparar este segmento
                float harmonicScore = CalculateSpectralCorrelation(normRef, normTest) * 100;
                float powerScore = CalculatePowerSimilarity(normRef, normTest) * 100;
                float score = harmonicScore * 0.6f + powerScore * 0.4f;

                if (score > bestScore)
                {
                    bestScore = score;
                    bestHarmonicScore = harmonicScore;
                    bestPowerScore = powerScore;
                    
                    // Convertir índice de espectro a tiempo (aproximado)
                    // Cada bin de frecuencia corresponde a windowSize/sampleRate segundos
                    float binTime = windowSize / sampleRate;
                    bestTimeSeconds = offset * binTime;
                }
            }

            return new ComparisonResult
            {
                SimilarityScore = Math.Min(100, Math.Max(0, bestScore)),
                HarmonicScore = bestHarmonicScore,
                PowerScore = bestPowerScore,
                TimeFoundSeconds = bestTimeSeconds >= 0 ? bestTimeSeconds : -1
            };
        }
    }
}
