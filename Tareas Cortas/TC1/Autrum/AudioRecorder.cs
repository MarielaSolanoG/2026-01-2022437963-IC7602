using NAudio.Wave;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Autrum
{
    public class AudioRecorder
    {
        private IWaveIn waveIn;
        private WaveFileWriter writer;
        private string outputPath;
        private List<float> sampleBuffer = new List<float>();

        // Eventos para notificar cambios
        public event EventHandler<float[]> DataAvailable; // Se dispara cuando hay datos nuevos
        public event EventHandler<float[]> BufferReady; // Se dispara cada 5 segundos

        private int sampleRate = 44100;
        private int samplesPerSecond => sampleRate;
        private int samplesFor5Seconds => sampleRate * 3;  // Cambié a 3 segundos
        private bool isPaused = false;

        public AudioRecorder()
        {
            waveIn = new WaveInEvent();
            waveIn.WaveFormat = new WaveFormat(sampleRate, 16, 1);
            waveIn.DataAvailable += WaveIn_DataAvailable;
        }

        public void StartRecording(string path)
        {
            outputPath = path;
            writer = new WaveFileWriter(outputPath, waveIn.WaveFormat);
            sampleBuffer.Clear();
            isPaused = false;
            waveIn.StartRecording();
        }

        public void PauseRecording()
        {
            isPaused = true;
            waveIn.StopRecording();
        }

        public void ContinueRecording()
        {
            isPaused = false;
            waveIn.StartRecording();
        }

        public void StopRecording()
        {
            waveIn.StopRecording();
            writer?.Dispose();
            
            // Procesar buffer final
            if (sampleBuffer.Count > 0)
            {
                BufferReady?.Invoke(this, sampleBuffer.ToArray());
            }
        }

        private void WaveIn_DataAvailable(object sender, WaveInEventArgs e)
        {
            if (isPaused) return;

            writer?.Write(e.Buffer, 0, e.BytesRecorded);

            // Convertir bytes a float32
            float[] samples = ConvertBytesToFloat(e.Buffer, e.BytesRecorded);
            sampleBuffer.AddRange(samples);
            
            // Notificar que hay nuevos datos
            DataAvailable?.Invoke(this, samples);

            // Emitir evento cada 5 segundos
            if (sampleBuffer.Count >= samplesFor5Seconds)
            {
                float[] buffer5Sec = sampleBuffer.Take(samplesFor5Seconds).ToArray();
                BufferReady?.Invoke(this, buffer5Sec);
                
                // Mantener el resto de los datos
                sampleBuffer = sampleBuffer.Skip(samplesFor5Seconds).ToList();
            }
        }

        private float[] ConvertBytesToFloat(byte[] buffer, int bytesRecorded)
        {
            float[] samples = new float[bytesRecorded / 2]; // 16-bit = 2 bytes
            
            for (int i = 0; i < samples.Length; i++)
            {
                short sample = BitConverter.ToInt16(buffer, i * 2);
                samples[i] = sample / 32768.0f;
            }
            
            return samples;
        }

        public float[] GetAllRecordedSamples()
        {
            if (File.Exists(outputPath))
            {
                using (var reader = new AudioFileReader(outputPath))
                {
                    float[] buffer = new float[reader.Length];
                    reader.Read(buffer, 0, (int)reader.Length);
                    return buffer;
                }
            }
            return sampleBuffer.ToArray();
        }

        public void Dispose()
        {
            waveIn?.Dispose();
            writer?.Dispose();
        }
    }
}
