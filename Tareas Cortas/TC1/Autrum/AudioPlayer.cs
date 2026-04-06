using NAudio.Wave;
using System;

namespace Autrum
{
    public class AudioPlayer : IDisposable
    {
        private IWavePlayer waveOutDevice;
        private AudioFileReader audioFileReader;
        private System.Timers.Timer positionTimer;

        public event EventHandler<PositionChangedEventArgs> PositionChanged;

        public class PositionChangedEventArgs : EventArgs
        {
            public TimeSpan Position { get; set; }
            public TimeSpan Duration { get; set; }
        }

        public AudioPlayer()
        {
            waveOutDevice = new WaveOutEvent();
            positionTimer = new System.Timers.Timer(100);
            positionTimer.Elapsed += PositionTimer_Elapsed;
        }

        public bool LoadAudio(string filePath)
        {
            try
            {
                positionTimer.Stop();

                if (waveOutDevice != null)
                {
                    waveOutDevice.Stop();
                    waveOutDevice.Dispose();
                }

                audioFileReader?.Dispose();

                audioFileReader = new AudioFileReader(filePath);
                waveOutDevice = new WaveOutEvent();
                waveOutDevice.Init(audioFileReader);
                return true;
            }
            catch
            {
                return false;
            }
        }

        public void Play()
        {
            waveOutDevice?.Play();
            positionTimer.Start();
        }

        public void Pause()
        {
            waveOutDevice?.Pause();
            positionTimer.Stop();
        }

        public void Stop()
        {
            waveOutDevice?.Stop();
            positionTimer.Stop();
            if (audioFileReader != null)
                audioFileReader.CurrentTime = TimeSpan.Zero;
        }

        public void Seek(TimeSpan position)
        {
            if (audioFileReader != null)
            {
                if (position < TimeSpan.Zero)
                    position = TimeSpan.Zero;

                if (position > audioFileReader.TotalTime)
                    position = audioFileReader.TotalTime;

                audioFileReader.CurrentTime = position;
            }
        }

        public TimeSpan GetCurrentPosition()
        {
            return audioFileReader?.CurrentTime ?? TimeSpan.Zero;
        }

        public TimeSpan GetTotalDuration()
        {
            return audioFileReader?.TotalTime ?? TimeSpan.Zero;
        }

        public float[] GetAudioSamples()
        {
            if (audioFileReader == null) return new float[0];

            var samples = new float[audioFileReader.WaveFormat.SampleRate];
            audioFileReader.Read(samples, 0, samples.Length);
            return samples;
        }

        private void PositionTimer_Elapsed(object sender, System.Timers.ElapsedEventArgs e)
        {
            var args = new PositionChangedEventArgs
            {
                Position = GetCurrentPosition(),
                Duration = GetTotalDuration()
            };
            PositionChanged?.Invoke(this, args);
        }

        public void Dispose()
        {
            positionTimer?.Dispose();
            audioFileReader?.Dispose();
            waveOutDevice?.Dispose();
        }
    }
}
