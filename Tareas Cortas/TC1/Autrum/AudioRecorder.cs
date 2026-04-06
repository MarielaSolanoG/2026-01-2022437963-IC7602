using NAudio.Wave;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Autrum
{
    public class AudioRecorder
    {
        private WaveFileWriter writer;
        private string outputPath;
        private List<float> sampleBuffer = new List<float>();

        // Eventos para notificar cambios
        public event EventHandler<float[]> DataAvailable; // Se dispara cuando hay datos nuevos
        public event EventHandler<float[]> BufferReady;   // Se dispara cada 3 segundos

        private int sampleRate = 44100;
        private int samplesFor3Seconds => sampleRate * 3;
        private bool isPaused = false;
        private bool isRecording = false;

        // WaveFormat compartido para mantener consistencia al reinicializar
        private WaveFormat waveFormat;

        // El dispositivo se crea y destruye según sea necesario
        private WaveInEvent waveIn;

        public AudioRecorder()
        {
            waveFormat = new WaveFormat(sampleRate, 16, 1);
            InicializarDispositivo();
        }

        /// <summary>
        /// Crea un nuevo WaveInEvent y suscribe el evento.
        /// Se llama en el constructor y cada vez que se reanuda la grabación,
        /// porque NAudio no permite reutilizar un WaveInEvent después de StopRecording().
        /// </summary>
        private void InicializarDispositivo()
        {
            waveIn = new WaveInEvent();
            waveIn.WaveFormat = waveFormat;
            waveIn.DataAvailable += WaveIn_DataAvailable;
        }

        public void StartRecording(string path)
        {
            outputPath = path;
            writer = new WaveFileWriter(outputPath, waveFormat);
            sampleBuffer.Clear();
            isPaused = false;
            isRecording = true;
            waveIn.StartRecording();
        }

        public void PauseRecording()
        {
            if (!isRecording || isPaused) return;

            isPaused = true;

            // Detener y destruir el dispositivo actual
            waveIn.DataAvailable -= WaveIn_DataAvailable;
            waveIn.StopRecording();
            waveIn.Dispose();

            // Flush del writer para que el WAV quede válido en disco durante la pausa
            writer?.Flush();
        }

        public void ContinueRecording()
        {
            if (!isRecording || !isPaused) return;

            isPaused = false;

            // Crear un dispositivo nuevo (NAudio no permite reusar el anterior)
            InicializarDispositivo();
            waveIn.StartRecording();
        }

        public void StopRecording()
        {
            if (!isRecording) return;

            isRecording = false;
            isPaused = false;

            // Solo detener si el dispositivo está activo
            try
            {
                waveIn.DataAvailable -= WaveIn_DataAvailable;
                waveIn.StopRecording();
                waveIn.Dispose();
            }
            catch { /* Ignorar si ya estaba detenido */ }

            // Cerrar el archivo WAV correctamente
            writer?.Dispose();
            writer = null;

            // Procesar buffer final si quedaron muestras sin emitir
            if (sampleBuffer.Count > 0)
            {
                BufferReady?.Invoke(this, sampleBuffer.ToArray());
            }

            // Crear dispositivo fresco para la próxima grabación
            InicializarDispositivo();
        }

        private void WaveIn_DataAvailable(object sender, WaveInEventArgs e)
        {
            if (isPaused || !isRecording) return;

            // Escribir al archivo WAV
            writer?.Write(e.Buffer, 0, e.BytesRecorded);

            // Convertir bytes a float32
            float[] samples = ConvertBytesToFloat(e.Buffer, e.BytesRecorded);
            sampleBuffer.AddRange(samples);

            // Notificar nuevos datos (para actualizar gráfica en tiempo real)
            DataAvailable?.Invoke(this, samples);

            // Emitir evento cada 3 segundos (para calcular FFT)
            if (sampleBuffer.Count >= samplesFor3Seconds)
            {
                float[] buffer3Sec = sampleBuffer.Take(samplesFor3Seconds).ToArray();
                BufferReady?.Invoke(this, buffer3Sec);

                // Conservar el resto
                sampleBuffer = sampleBuffer.Skip(samplesFor3Seconds).ToList();
            }
        }

        private float[] ConvertBytesToFloat(byte[] buffer, int bytesRecorded)
        {
            float[] samples = new float[bytesRecorded / 2]; // 16-bit = 2 bytes por muestra

            for (int i = 0; i < samples.Length; i++)
            {
                short sample = BitConverter.ToInt16(buffer, i * 2);
                samples[i] = sample / 32768.0f;
            }

            return samples;

        /// <summary>
        {
            // Asegurarse de que el writer esté flushado antes de leer
            writer?.Flush();

            if (File.Exists(outputPath))
            {
                try
                {
                    using (var reader = new AudioFileReader(outputPath))
                    {
                        var allSamples = new List<float>();
                        float[] readBuffer = new float[4096];
                        int samplesRead;

                        while ((samplesRead = reader.Read(readBuffer, 0, readBuffer.Length)) > 0)
                        {
                            allSamples.AddRange(readBuffer.Take(samplesRead));
                        }

                        return allSamples.ToArray();
                    }
                }
                catch
                {
                    return sampleBuffer.ToArray();
                }
            }

            return sampleBuffer.ToArray();
        }

        public void Dispose()
        {
            try { waveIn?.Dispose(); } catch { }
            try { writer?.Dispose(); } catch { }
        }
    }
}
