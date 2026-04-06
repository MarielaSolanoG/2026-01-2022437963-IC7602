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
        private const float MinimumMatchScore = 35f;
        private const float MinimumCorrelationScore = 45f;

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

            // Pasar de dB a amplitud lineal para evitar que la escala logarítmica
            // haga que espectros distintos terminen demasiado parecidos.
            float[] linear1 = ConvertDbToLinear(spectrum1.Magnitudes);
            float[] linear2 = ConvertDbToLinear(spectrum2.Magnitudes);

            // Normalizar por suma para comparar la forma del espectro.
            float[] norm1 = NormalizeSpectrum(linear1);
            float[] norm2 = NormalizeSpectrum(linear2);

            // Asegurar mismo tamaño
            int minLength = Math.Min(norm1.Length, norm2.Length);
            Array.Resize(ref norm1, minLength);
            Array.Resize(ref norm2, minLength);
            Array.Resize(ref linear1, minLength);
            Array.Resize(ref linear2, minLength);

            // Calcular similitud armónica (distancia entre distribuciones espectrales)
            float harmonicScore = CalculateSpectralSimilarity(norm1, norm2) * 100;

            // Calcular similitud de potencia (energía RMS sobre la señal lineal)
            float powerScore = CalculatePowerSimilarity(linear1, linear2) * 100;

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
            float sum = spectrum.Sum(x => Math.Max(0, x));
            if (sum <= 0) return new float[spectrum.Length];

            return spectrum.Select(x => Math.Max(0, x) / sum).ToArray();
        }

        private float[] ConvertDbToLinear(float[] spectrum)
        {
            float[] linear = new float[spectrum.Length];

            for (int i = 0; i < spectrum.Length; i++)
            {
                linear[i] = (float)Math.Pow(10, spectrum[i] / 20f);
            }

            return linear;
        }

        private float CalculateSpectralSimilarity(float[] spec1, float[] spec2)
        {
            float distance = 0;

            for (int i = 0; i < spec1.Length; i++)
            {
                distance += Math.Abs(spec1[i] - spec2[i]);
            }

            float similarity = 1f - (distance * 0.5f);
            return Math.Max(0f, Math.Min(1f, similarity));
        }

        private float CalculatePowerSimilarity(float[] spec1, float[] spec2)
        {
            float power1 = GetRmsPower(spec1);
            float power2 = GetRmsPower(spec2);

            if (power1 == 0 || power2 == 0)
                return 0;

            float ratio = Math.Min(power1, power2) / Math.Max(power1, power2);
            return Math.Max(0f, Math.Min(1f, ratio));
        }

        private float GetRmsPower(float[] values)
        {
            if (values == null || values.Length == 0)
                return 0;

            float sumSquares = 0;

            for (int i = 0; i < values.Length; i++)
            {
                sumSquares += values[i] * values[i];
            }

            return (float)Math.Sqrt(sumSquares / values.Length);
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

            float[] testLinear = ConvertDbToLinear(testSpectrum.Magnitudes);
            float[] normTest = NormalizeSpectrum(testLinear);

            float bestScore = -1;
            float bestTimeSeconds = -1;
            float bestHarmonicScore = 0;
            float bestPowerScore = 0;

            // Deslizar ventana sobre el espectro de referencia
            int windowCount = Math.Max(1, referenceSpectrum.Magnitudes.Length - normTest.Length + 1);
            
            for (int offset = 0; offset < windowCount; offset++)
            {
                // Extraer ventana de referencias magnitudes
                float[] windowRef = new float[normTest.Length];
                Array.Copy(referenceSpectrum.Magnitudes, offset, windowRef, 0, normTest.Length);
                
                float[] refLinear = ConvertDbToLinear(windowRef);
                float[] normRef = NormalizeSpectrum(refLinear);

                // Comparar este segmento
                float harmonicScore = CalculateSpectralSimilarity(normRef, normTest) * 100;
                float powerScore = CalculatePowerSimilarity(refLinear, testLinear) * 100;
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

            if (bestScore < MinimumMatchScore)
            {
                return new ComparisonResult
                {
                    SimilarityScore = Math.Max(0, bestScore),
                    HarmonicScore = bestHarmonicScore,
                    PowerScore = bestPowerScore,
                    TimeFoundSeconds = -1
                };
            }

            return new ComparisonResult
            {
                SimilarityScore = Math.Min(100, Math.Max(0, bestScore)),
                HarmonicScore = bestHarmonicScore,
                PowerScore = bestPowerScore,
                TimeFoundSeconds = bestTimeSeconds >= 0 ? bestTimeSeconds : -1
            };
        }


        public ComparisonResult CompareWithTimeSearch(float[] referenceSamples, float[] testSamples,
                                                    float sampleRate = 44100f, int windowSize = 2048, int hopSize = 512)
        {
            if (referenceSamples == null || testSamples == null)
                return new ComparisonResult { SimilarityScore = 0, TimeFoundSeconds = -1 };

            if (referenceSamples.Length < windowSize || testSamples.Length < windowSize)
                return new ComparisonResult { SimilarityScore = 0, TimeFoundSeconds = -1 };

            // Para voz, la envolvente de energía es más estable que la forma de onda cruda.
            int frameSize = Math.Max(256, (int)(sampleRate * 0.02f)); // ~20 ms por frame
            float[] referenceEnvelope = BuildEnergyEnvelope(referenceSamples, frameSize);
            float[] testEnvelope = BuildEnergyEnvelope(testSamples, frameSize);

            float[] trimmedTest = TrimEnvelopeSilence(testEnvelope);
            if (trimmedTest.Length < 3 || referenceEnvelope.Length < trimmedTest.Length)
                return new ComparisonResult { SimilarityScore = 0, TimeFoundSeconds = -1 };

            int frameHop = Math.Max(1, hopSize / frameSize);

            float bestScore = -1;
            float bestCorrelation = -1;
            float bestHarmonicScore = 0;
            float bestPowerScore = 0;
            int bestOffsetFrame = -1;

            float testMean = trimmedTest.Average();
            float[] centeredTest = new float[trimmedTest.Length];
            float testEnergy = 0;

            for (int i = 0; i < trimmedTest.Length; i++)
            {
                centeredTest[i] = trimmedTest[i] - testMean;
                testEnergy += centeredTest[i] * centeredTest[i];
            }

            if (testEnergy <= 1e-9f)
                return new ComparisonResult { SimilarityScore = 0, TimeFoundSeconds = -1 };

            float testRms = GetRmsPower(trimmedTest);

            for (int offset = 0; offset <= referenceEnvelope.Length - trimmedTest.Length; offset += frameHop)
            {
                float sumReference = 0;
                for (int i = 0; i < trimmedTest.Length; i++)
                {
                    sumReference += referenceEnvelope[offset + i];
                }

                float referenceMean = sumReference / trimmedTest.Length;

                float numerator = 0;
                float referenceEnergy = 0;

                for (int i = 0; i < trimmedTest.Length; i++)
                {
                    float centeredReference = referenceEnvelope[offset + i] - referenceMean;
                    numerator += centeredReference * centeredTest[i];
                    referenceEnergy += centeredReference * centeredReference;
                }

                if (referenceEnergy <= 1e-9f)
                    continue;

                float correlation = numerator / (float)Math.Sqrt(referenceEnergy * testEnergy);
                correlation = Math.Max(-1f, Math.Min(1f, correlation));

                float harmonicScore = Math.Max(0f, correlation) * 100f;
                float referenceRms = (float)Math.Sqrt(referenceEnergy / trimmedTest.Length);

                // Evita que zonas de casi silencio compitan contra una palabra hablada.
                if (referenceRms < testRms * 0.35f)
                    continue;

                float powerScore = Math.Min(referenceRms, testRms) / Math.Max(referenceRms, testRms) * 100f;

                float score = harmonicScore * 0.85f + powerScore * 0.15f;

                if (score > bestScore)
                {
                    bestScore = score;
                    bestCorrelation = correlation;
                    bestHarmonicScore = harmonicScore;
                    bestPowerScore = powerScore;
                    bestOffsetFrame = offset;
                }
            }

            if (bestScore < MinimumCorrelationScore || bestCorrelation < 0.35f)
            {
                return new ComparisonResult
                {
                    SimilarityScore = Math.Max(0, bestScore),
                    HarmonicScore = bestHarmonicScore,
                    PowerScore = bestPowerScore,
                    TimeFoundSeconds = -1
                };
            }

            float bestTimeSeconds = -1;
            if (bestOffsetFrame >= 0)
            {
                float rawSeconds = (bestOffsetFrame * frameSize) / sampleRate;
                bestTimeSeconds = (float)Math.Round(rawSeconds);
            }

            return new ComparisonResult
            {
                SimilarityScore = Math.Min(100, Math.Max(0, bestScore)),
                HarmonicScore = bestHarmonicScore,
                PowerScore = bestPowerScore,
                TimeFoundSeconds = bestTimeSeconds
            };
        }

        private float[] BuildEnergyEnvelope(float[] samples, int frameSize)
        {
            if (samples == null || samples.Length == 0 || frameSize <= 0)
                return Array.Empty<float>();

            int frameCount = samples.Length / frameSize;
            if (frameCount == 0)
                return Array.Empty<float>();

            float[] envelope = new float[frameCount];

            for (int frame = 0; frame < frameCount; frame++)
            {
                int start = frame * frameSize;
                float sumSquares = 0;

                for (int i = 0; i < frameSize; i++)
                {
                    float value = samples[start + i];
                    sumSquares += value * value;
                }

                envelope[frame] = (float)Math.Sqrt(sumSquares / frameSize);
            }

            return envelope;
        }

        private float[] TrimEnvelopeSilence(float[] envelope)
        {
            if (envelope == null || envelope.Length == 0)
                return Array.Empty<float>();

            float maxValue = envelope.Max();
            if (maxValue <= 0)
                return Array.Empty<float>();

            float threshold = maxValue * 0.25f;

            int start = 0;
            while (start < envelope.Length && envelope[start] < threshold)
                start++;

            int end = envelope.Length - 1;
            while (end >= start && envelope[end] < threshold)
                end--;

            if (end < start)
                return Array.Empty<float>();

            int length = end - start + 1;
            float[] trimmed = new float[length];
            Array.Copy(envelope, start, trimmed, 0, length);
            return trimmed;
        }

        private float[] TrimSilence(float[] samples)
        {
            if (samples == null || samples.Length == 0)
                return Array.Empty<float>();

            float maxAmplitude = samples.Max(x => Math.Abs(x));
            if (maxAmplitude <= 0)
                return Array.Empty<float>();

            float threshold = maxAmplitude * 0.08f;

            int start = 0;
            while (start < samples.Length && Math.Abs(samples[start]) < threshold)
                start++;

            int end = samples.Length - 1;
            while (end >= start && Math.Abs(samples[end]) < threshold)
                end--;

            if (end < start)
                return Array.Empty<float>();

            int length = end - start + 1;
            float[] trimmed = new float[length];
            Array.Copy(samples, start, trimmed, 0, length);
            return trimmed;
        }

        private float[] Downsample(float[] samples, int factor)
        {
            if (samples == null || samples.Length == 0)
                return Array.Empty<float>();

            if (factor <= 1)
                return samples.ToArray();

            int downsampledLength = samples.Length / factor;
            if (downsampledLength == 0)
                return Array.Empty<float>();

            float[] downsampled = new float[downsampledLength];

            for (int i = 0; i < downsampledLength; i++)
            {
                int sampleIndex = i * factor;
                downsampled[i] = samples[sampleIndex];
            }

            return downsampled;
        }

    }
}
