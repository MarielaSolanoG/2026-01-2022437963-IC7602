using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Windows.Forms;

namespace Autrum
{
    public partial class MainForm : Form
    {
        private AudioRecorder recorder;
        private AudioPlayer player;
        private FftProcessor fftProcessor;
        private AudioComparator comparator;
        private AtmFileManager fileManager;
        private System.Windows.Forms.Timer updateTimer;
        private System.Windows.Forms.Timer comparatorUpdateTimer;


        private AudioRecorder comparatorRecorder;
        private List<AtmFileManager.SpectrumFrame> referenceSpectrumFrames;
        private AtmFileManager.SpectrumFrame testSpectrumLatest;
        private List<float> comparatorAudioSamples;
        private float[] referenceAudioSamples;
        private string referenceAudioPath;

        // Variables para zoom - SOLO EN REPRODUCTOR
        private float zoomFactorPlayback = 1.0f;
        private int scrollPositionPlayback = 0;

        public MainForm()
        {
            InitializeComponent();
            InitializeAudioComponents();
            InitializeTimers();
        }

        private void InitializeTimers()
        {
            // Timer para actualizar gráficos del Analizador
            updateTimer = new System.Windows.Forms.Timer();
            updateTimer.Interval = 100; // Actualizar cada 100ms
            updateTimer.Tick += UpdateTimer_Tick;

            // Timer para actualizar gráficos del Comparador
            comparatorUpdateTimer = new System.Windows.Forms.Timer();
            comparatorUpdateTimer.Interval = 100;
            comparatorUpdateTimer.Tick += ComparatorUpdateTimer_Tick;
        }

        private void InitializeAudioComponents()
        {
            recorder = new AudioRecorder();
            player = new AudioPlayer();
            fftProcessor = new FftProcessor();
            comparator = new AudioComparator();
            fileManager = new AtmFileManager();

            // Eventos del grabador
            recorder.DataAvailable += Recorder_DataAvailable;
            recorder.BufferReady += Recorder_BufferReady;
            
            player.PositionChanged += Player_PositionChanged;

            // Eventos de zoom en el Reproductor
            panelWaveform.MouseWheel += PanelWaveform_MouseWheel;
            panelWaveform.KeyDown += PanelWaveform_KeyDown;
            panelWaveform.Focus();
        }

        private void PanelWaveform_MouseWheel(object sender, MouseEventArgs e)
        {
            if (e.Delta > 0)
                ZoomIn_Playback();
            else
                ZoomOut_Playback();
        }

        private void PanelWaveform_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Add)
                ZoomIn_Playback();
            else if (e.KeyCode == Keys.Subtract)
                ZoomOut_Playback();
            else if (e.KeyCode == Keys.Oemplus)
                ZoomIn_Playback();
            else if (e.KeyCode == Keys.OemMinus)
                ZoomOut_Playback();
        }

        private void Recorder_DataAvailable(object sender, float[] samples)
        {
            // Acumular muestras de audio en tiempo real
            if (lastAudioSamples == null)
                lastAudioSamples = new List<float>();
            
            ((List<float>)lastAudioSamples).AddRange(samples);
        }

        private void Recorder_BufferReady(object sender, float[] buffer)
        {
            // Calcular FFT cada 3 segundos
            var spectrum = fftProcessor.ProcessAudio(buffer);
            
            float timeSeconds = spectrumFrames.Count * 3f;
            spectrumFrames.Add(new AtmFileManager.SpectrumFrame
            {
                TimeSeconds = timeSeconds,
                Frequencies = spectrum.Frequencies,
                Magnitudes = spectrum.Magnitudes
            });
        }

        private void UpdateTimer_Tick(object sender, EventArgs e)
        {
            // Actualizar gráficos en tiempo real durante grabación
            if (lastAudioSamples == null) return;

            List<float> samples = lastAudioSamples as List<float>;
            if (samples == null || samples.Count == 0) return;

            float[] allSamples = samples.ToArray();

            // Crear bitmap para dibujar ambos gráficos
            int panelWidth = panelSpectrumAnalysis.Width;
            int panelHeight = panelSpectrumAnalysis.Height;
            
            Bitmap bitmap = new Bitmap(panelWidth, panelHeight);
            Graphics g = Graphics.FromImage(bitmap);
            
            try
            {
                // Dividir en dos mitades
                int halfWidth = panelWidth / 2;
                
                // Gráfico 1: Onda (izquierda)
                Rectangle waveRect = new Rectangle(0, 0, halfWidth, panelHeight);
                DrawWaveformOnBitmap(g, waveRect, allSamples);
                
                // Gráfico 2: Espectro FFT (derecha) - mostrar el último frame disponible
                if (spectrumFrames.Count > 0)
                {
                    Rectangle spectrumRect = new Rectangle(halfWidth, 0, halfWidth, panelHeight);
                    DrawSpectrumOnBitmap(g, spectrumRect, spectrumFrames[spectrumFrames.Count - 1]);
                }
            }
            finally 
            { 
                g?.Dispose(); 
            }
            
            // Mostrar en panel
            if (panelSpectrumAnalysis.InvokeRequired)
            {
                panelSpectrumAnalysis.Invoke(() => panelSpectrumAnalysis.BackgroundImage = bitmap);
            }
            else
            {
                panelSpectrumAnalysis.BackgroundImage = bitmap;
            }
        }

        private void ComparatorUpdateTimer_Tick(object sender, EventArgs e)
        {
            // Actualizar gráficos en tiempo real durante grabación de prueba en Comparador
            // Nota: Sin panel asignado, se omite visualización en tiempo real para el Comparador
            // Los gráficos se mostrarían después de completar btnCompare()
        }

        private List<AtmFileManager.SpectrumFrame> spectrumFrames = new List<AtmFileManager.SpectrumFrame>();

        private void Player_PositionChanged(object sender, AudioPlayer.PositionChangedEventArgs e)
        {
            // Actualizar UI siempre desde el hilo principal
            if (this.InvokeRequired)
            {
                this.Invoke(() => Player_PositionChanged(sender, e));
                return;
            }

            // Contador en segundos: "0:23 / 1:45"
            int posSeconds = (int)e.Position.TotalSeconds;
            int durSeconds = (int)e.Duration.TotalSeconds;
            labelPlaybackTime.Text = $"{posSeconds / 60}:{posSeconds % 60:D2}  /  {durSeconds / 60}:{durSeconds % 60:D2}";

            // Barra de progreso
            trackBarPlayback.Maximum = durSeconds;
            trackBarPlayback.Value = Math.Min(posSeconds, durSeconds);

            // Cuando termina el audio, volver al estado inicial
            if (posSeconds >= durSeconds && durSeconds > 0)
            {
                player.Stop();
                btnPlay.Enabled = true;
                btnPause.Enabled = false;
                return;
            }

            // Actualizar gráficos durante reproducción
            if (loadedSpectrumFrames == null || loadedAudioSamples == null) return;

            float currentSeconds = (float)e.Position.TotalSeconds;

            int closestFrame = 0;
            float minDiff = float.MaxValue;
            for (int i = 0; i < loadedSpectrumFrames.Count; i++)
            {
                float diff = Math.Abs(loadedSpectrumFrames[i].TimeSeconds - currentSeconds);
                if (diff < minDiff) { minDiff = diff; closestFrame = i; }
            }

            int sampleRate = 44100;
            int samplesUntilNow = Math.Min((int)(currentSeconds * sampleRate), loadedAudioSamples.Length);
            float[] displayedSamples = new float[samplesUntilNow];
            Array.Copy(loadedAudioSamples, 0, displayedSamples, 0, samplesUntilNow);

            Bitmap bitmap = new Bitmap(panelWaveform.Width, panelWaveform.Height);
            Graphics g = Graphics.FromImage(bitmap);
            try
            {
                int halfWidth = panelWaveform.Width / 2;
                DrawWaveformOnBitmap(g, new Rectangle(0, 0, halfWidth, panelWaveform.Height),
                    displayedSamples, zoomFactorPlayback, scrollPositionPlayback);
                DrawSpectrumOnBitmap(g, new Rectangle(halfWidth, 0, halfWidth, panelWaveform.Height),
                    loadedSpectrumFrames[closestFrame], zoomFactorPlayback, scrollPositionPlayback);
            }
            finally { g?.Dispose(); }

            panelWaveform.BackgroundImage = bitmap;
        }

        // ===== TAB 1: ANÁLISIS =====
    private void btnStartRecording_Click(object sender, EventArgs e)
    {
        if (recorder != null)
        {
            string path = Path.Combine(Path.GetTempPath(), "autrum_recording.wav");
            currentAudioPath = path; // ← guardar path
            spectrumFrames.Clear();
            lastAudioSamples = new List<float>();

            recorder.StartRecording(path);

            // Estado de botones al INICIAR
            btnStartRecording.Enabled = false;
            btnStopRecording.Enabled = true;
            btnPauseRecording.Enabled = true;    // ← habilitar Pausar
            btnContinueRecording.Enabled = false; // ← Continuar deshabilitado al inicio
            btnSaveAnalysis.Enabled = false;

            labelRecordingStatus.Text = "Grabando...";
            labelRecordingStatus.ForeColor = Color.Red;

            updateTimer.Start();
        }
    }

    private void btnPauseRecording_Click(object sender, EventArgs e)
    {
        if (recorder != null)
        {
            recorder.PauseRecording();
            updateTimer.Stop();                   // ← detener gráficas

            // Estado de botones al PAUSAR
            btnPauseRecording.Enabled = false;    // ← deshabilitar Pausar
            btnContinueRecording.Enabled = true;  // ← habilitar Continuar

            labelRecordingStatus.Text = "En pausa";
            labelRecordingStatus.ForeColor = Color.Orange;
        }
    }

    private void btnContinueRecording_Click(object sender, EventArgs e)
    {
        if (recorder != null)
        {
            recorder.ContinueRecording();
            updateTimer.Start();                  // ← reanudar gráficas

            // Estado de botones al CONTINUAR
            btnPauseRecording.Enabled = true;     // ← habilitar Pausar
            btnContinueRecording.Enabled = false; // ← deshabilitar Continuar

            labelRecordingStatus.Text = "Grabando...";
            labelRecordingStatus.ForeColor = Color.Red;
        }
    }

    private void btnStopRecording_Click(object sender, EventArgs e)
    {
        if (recorder != null)
        {
            updateTimer.Stop();
            recorder.StopRecording();

            // Estado de botones al DETENER
            btnStartRecording.Enabled = true;
            btnStopRecording.Enabled = false;
            btnPauseRecording.Enabled = false;    // ← deshabilitar Pausar
            btnContinueRecording.Enabled = false; // ← deshabilitar Continuar
            btnSaveAnalysis.Enabled = true;

            labelRecordingStatus.Text = "Grabación detenida";
            labelRecordingStatus.ForeColor = Color.Green;

            // Mostrar gráficas finales (igual que antes)
            float[] allSamples = recorder.GetAllRecordedSamples();
            int panelWidth = panelSpectrumAnalysis.Width;
            int panelHeight = panelSpectrumAnalysis.Height;
            Bitmap bitmap = new Bitmap(panelWidth, panelHeight);
            Graphics g = Graphics.FromImage(bitmap);
            try
            {
                int halfWidth = panelWidth / 2;
                Rectangle waveRect = new Rectangle(0, 0, halfWidth, panelHeight);
                DrawWaveformOnBitmap(g, waveRect, allSamples);
                if (spectrumFrames.Count > 0)
                {
                    Rectangle spectrumRect = new Rectangle(halfWidth, 0, halfWidth, panelHeight);
                    DrawSpectrumOnBitmap(g, spectrumRect, spectrumFrames[spectrumFrames.Count - 1]);
                }
            }
            finally { g?.Dispose(); }
            panelSpectrumAnalysis.BackgroundImage = bitmap;
        }
    }

        private void DrawWaveformOnBitmap(Graphics g, Rectangle rect, float[] audioSamples, float zoomFactor = 1.0f, int scrollPos = 0)
        {
            if (audioSamples == null || audioSamples.Length == 0) return;

            g.FillRectangle(Brushes.Black, rect);
            int centerY = rect.Top + rect.Height / 2;

            // Calcular rango de muestras a mostrar (con zoom)
            int totalSamples = audioSamples.Length;
            int visibleSamples = (int)(totalSamples / zoomFactor);
            int startSample = Math.Min(scrollPos, totalSamples - visibleSamples);
            int endSample = Math.Min(startSample + visibleSamples, totalSamples);
            
            float maxAmplitude = 0;
            for (int i = startSample; i < endSample; i++)
            {
                if (Math.Abs(audioSamples[i]) > maxAmplitude)
                    maxAmplitude = Math.Abs(audioSamples[i]);
            }
            if (maxAmplitude == 0) maxAmplitude = 1;

            using (Pen pen = new Pen(Color.Cyan, 1))
            {
                // Línea central
                using (Pen centerLine = new Pen(Color.Gray, 1))
                {
                    centerLine.DashStyle = DashStyle.Dash;
                    g.DrawLine(centerLine, rect.Left, centerY, rect.Right, centerY);
                }

                // Dibujar onda
                int samplesVisible = Math.Max(1, endSample - startSample);
                int samplesPerPixel = Math.Max(1, samplesVisible / rect.Width);
                
                for (int x = 0; x < rect.Width - 1; x++)
                {
                    int idx1 = startSample + x * samplesPerPixel;
                    int idx2 = startSample + (x + 1) * samplesPerPixel;
                    if (idx1 >= endSample) break;
                    if (idx2 >= endSample) idx2 = endSample - 1;

                    int y1 = centerY - (int)((audioSamples[idx1] / maxAmplitude) * (rect.Height / 2 - 10));
                    int y2 = centerY - (int)((audioSamples[idx2] / maxAmplitude) * (rect.Height / 2 - 10));

                    g.DrawLine(pen, rect.Left + x, y1, rect.Left + x + 1, y2);
                }
            }

            // Ejes
            using (Pen axisPen = new Pen(Color.White, 1))
            {
                g.DrawLine(axisPen, rect.Left, centerY, rect.Right, centerY);
                g.DrawLine(axisPen, rect.Left, rect.Top, rect.Left, rect.Bottom);
            }

            // Etiqueta
            using (Font font = new Font("Arial", 8))
            using (Brush textBrush = new SolidBrush(Color.White))
            {
                g.DrawString("Dominio del Tiempo", font, textBrush, rect.Left + 5, rect.Top + 5);
                if (zoomFactor > 1.0f)
                    g.DrawString($"Zoom: {zoomFactor:F1}x", font, textBrush, rect.Left + 5, rect.Top + 20);
            }
        }

        private void DrawSpectrumOnBitmap(Graphics g, Rectangle rect, AtmFileManager.SpectrumFrame spectrum, float zoomFactor = 1.0f, int scrollPos = 0)
        {
            if (spectrum == null || spectrum.Magnitudes.Length == 0) return;

            g.FillRectangle(Brushes.Black, rect);

            // Calcular rango de frecuencias a mostrar (con zoom)
            int totalFreqs = spectrum.Magnitudes.Length;
            int visibleFreqs = (int)(totalFreqs / zoomFactor);
            int startFreq = Math.Min(scrollPos, totalFreqs - visibleFreqs);
            int endFreq = Math.Min(startFreq + visibleFreqs, totalFreqs);

            float maxMagnitude = 0;
            float minMagnitude = float.MaxValue;
            
            // Encontrar máx y mín en el rango visible
            for (int i = startFreq; i < endFreq; i++)
            {
                if (spectrum.Magnitudes[i] > maxMagnitude)
                    maxMagnitude = spectrum.Magnitudes[i];
                if (spectrum.Magnitudes[i] < minMagnitude)
                    minMagnitude = spectrum.Magnitudes[i];
            }
            
            float range = maxMagnitude - minMagnitude + 1e-6f;

            using (Pen pen = new Pen(Color.Lime, 1))
            {
                int freqsVisible = Math.Max(1, endFreq - startFreq);
                
                for (int i = startFreq; i < endFreq - 1; i++)
                {
                    int relativeI = i - startFreq;
                    int relativeI1 = relativeI + 1;
                    
                    int x1 = rect.Left + (int)((relativeI / (float)freqsVisible) * rect.Width);
                    int x2 = rect.Left + (int)((relativeI1 / (float)freqsVisible) * rect.Width);

                    float norm1 = (spectrum.Magnitudes[i] - minMagnitude) / range;
                    float norm2 = (spectrum.Magnitudes[i + 1] - minMagnitude) / range;

                    int y1 = rect.Bottom - (int)(norm1 * rect.Height);
                    int y2 = rect.Bottom - (int)(norm2 * rect.Height);

                    if (x1 >= rect.Left && x1 < rect.Right && x2 >= rect.Left && x2 < rect.Right)
                    {
                        g.DrawLine(pen, x1, y1, x2, y2);
                    }
                }
            }

            // Ejes
            using (Pen axisPen = new Pen(Color.White, 1))
            {
                g.DrawLine(axisPen, rect.Left, rect.Bottom - 1, rect.Right, rect.Bottom - 1);
                g.DrawLine(axisPen, rect.Left, rect.Top, rect.Left, rect.Bottom);
            }

            // Etiqueta
            using (Font font = new Font("Arial", 8))
            using (Brush textBrush = new SolidBrush(Color.White))
            {
                g.DrawString($"Dominio de Frecuencia ({spectrum.TimeSeconds:F1}s)", font, textBrush, rect.Left + 5, rect.Top + 5);
                if (zoomFactor > 1.0f)
                    g.DrawString($"Zoom: {zoomFactor:F1}x", font, textBrush, rect.Left + 5, rect.Top + 20);
            }
        }

        private void btnSaveAnalysis_Click(object sender, EventArgs e)
        {
            if (spectrumFrames.Count == 0)
            {
                MessageBox.Show("No hay análisis grabado. Graba audio primero.");
                return;
            }

            using (SaveFileDialog dialog = new SaveFileDialog())
            {
                dialog.Filter = "Autrum Audio Files (*.atm)|*.atm";
                dialog.DefaultExt = "atm";
                dialog.FileName = $"Autrum_{DateTime.Now:yyyyMMdd_HHmmss}";
                
                if (dialog.ShowDialog() == DialogResult.OK)
                {
                    string tempAudio = currentAudioPath;
                    
                    var metadata = new AtmFileManager.AtmMetadata
                    {
                        AudioFormat = "WAV",
                        SampleRate = 44100,
                        Channels = 1,
                        Duration = spectrumFrames.Count * 3f,  // 3 segundos por frame
                        RecordedDate = DateTime.Now
                    };

                    if (fileManager.SaveAsAtm(tempAudio, dialog.FileName, metadata, spectrumFrames))
                    {
                        MessageBox.Show($"Archivos guardados en: {dialog.FileName}", "Éxito");
                    }
                    else
                    {
                        MessageBox.Show("Error al guardar archivo", "Error");
                    }
                }
            }
        }

        private void btnLoadWav_Click(object sender, EventArgs e)
        {
            using (OpenFileDialog dialog = new OpenFileDialog())
            {
                dialog.Filter = "WAV files (*.wav)|*.wav";
                if (dialog.ShowDialog() != DialogResult.OK) return;

                // Leer muestras del WAV
                float[] allSamples = LoadAudioSamples(dialog.FileName);
                if (allSamples.Length == 0)
                {
                    MessageBox.Show("No se pudo leer el archivo WAV.", "Error");
                    return;
                }

                // Calcular FFT en bloques de 3 segundos (igual que en grabación)
                spectrumFrames.Clear();
                lastAudioSamples = new List<float>(allSamples);

                int sampleRate = 44100;
                int samplesPerBlock = sampleRate * 3;
                float timeSeconds = 0f;

                for (int offset = 0; offset + samplesPerBlock <= allSamples.Length; offset += samplesPerBlock)
                {
                    float[] block = new float[samplesPerBlock];
                    Array.Copy(allSamples, offset, block, 0, samplesPerBlock);

                    var spectrum = fftProcessor.ProcessAudio(block);
                    spectrumFrames.Add(new AtmFileManager.SpectrumFrame
                    {
                        TimeSeconds = timeSeconds,
                        Frequencies = spectrum.Frequencies,
                        Magnitudes = spectrum.Magnitudes
                    });
                    timeSeconds += 3f;
                }

                // Mostrar gráficas
                int panelWidth = panelSpectrumAnalysis.Width;
                int panelHeight = panelSpectrumAnalysis.Height;
                Bitmap bitmap = new Bitmap(panelWidth, panelHeight);
                Graphics g = Graphics.FromImage(bitmap);

                try
                {
                    int halfWidth = panelWidth / 2;
                    DrawWaveformOnBitmap(g, new Rectangle(0, 0, halfWidth, panelHeight), allSamples);
                    if (spectrumFrames.Count > 0)
                        DrawSpectrumOnBitmap(g, new Rectangle(halfWidth, 0, halfWidth, panelHeight),
                            spectrumFrames[spectrumFrames.Count - 1]);
                }
                finally { g?.Dispose(); }

                panelSpectrumAnalysis.BackgroundImage = bitmap;

                // Habilitar guardar
                currentAudioPath = dialog.FileName;
                btnSaveAnalysis.Enabled = true;
                labelRecordingStatus.Text = $"WAV cargado: {Path.GetFileName(dialog.FileName)}";
                labelRecordingStatus.ForeColor = Color.Cyan;
            }
        }

        // ===== CONTROLES DE ZOOM - SOLO REPRODUCTOR =====
        
        public void ZoomIn_Playback()
        {
            zoomFactorPlayback = Math.Min(zoomFactorPlayback * 1.2f, 10f);
            scrollPositionPlayback = 0;
            // Forzar redibujado
            panelWaveform.Invalidate();
        }

        public void ZoomOut_Playback()
        {
            zoomFactorPlayback = Math.Max(zoomFactorPlayback / 1.2f, 1.0f);
            scrollPositionPlayback = 0;
            // Forzar redibujado
            panelWaveform.Invalidate();
        }

        // ===== TAB 2: REPRODUCCIÓN =====
        private List<AtmFileManager.SpectrumFrame> loadedSpectrumFrames;
        private string currentAudioPath; 
        private float[] loadedAudioSamples; // Almacenar muestras para dibujar onda
        
        private void btnLoadAudio_Click(object sender, EventArgs e)
        {
            using (OpenFileDialog dialog = new OpenFileDialog())
            {
                dialog.Filter = "Autrum Files (*.atm)|*.atm|All files (*.*)|*.*";
                if (dialog.ShowDialog() == DialogResult.OK)
                {
                    // Cargar archivo .atm
                    if (fileManager.LoadFromAtm(dialog.FileName, out string audioPath, out _, out loadedSpectrumFrames))
                    {
                        if (player.LoadAudio(audioPath))
                        {
                            // Cargar también las muestras de audio crudas para dibujar
                            loadedAudioSamples = LoadAudioSamples(audioPath);
                            
                            labelAudioPath.Text = Path.GetFileName(dialog.FileName);
                            btnPlay.Enabled = true;
                            labelPlaybackTime.Text = player.GetTotalDuration().ToString("hh\\:mm\\:ss");
                        }
                    }
                    else
                    {
                        MessageBox.Show("Error al cargar archivo .atm", "Error");
                    }
                }
            }
        }

        // Función para cargar muestras de audio de un archivo WAV
        private float[] LoadAudioSamples(string filePath)
        {
            try
            {
                using (var audioFileReader = new NAudio.Wave.AudioFileReader(filePath))
                {
                    List<float> samples = new List<float>();
                    float[] buffer = new float[4096];
                    int samplesRead;
                    
                    while ((samplesRead = audioFileReader.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        samples.AddRange(buffer.Take(samplesRead));
                    }
                    
                    return samples.ToArray();
                }
            }
            catch
            {
                return new float[0];
            }
        }

        private void btnPlay_Click(object sender, EventArgs e)
        {
            player.Play();
            btnPlay.Enabled = false;
            btnPause.Enabled = true;
            btnStop.Enabled = true;
            panelWaveform.Focus();
        }
        private void btnPause_Click(object sender, EventArgs e)
        {
            player.Pause();
            btnPlay.Enabled = true;
            btnPause.Enabled = false;
        }

        // Renombrado de Stop a Restart: vuelve al segundo 0
        private void btnStop_Click(object sender, EventArgs e)
        {
            player.Stop();
            btnPlay.Enabled = true;
            btnPause.Enabled = false;

            // Resetear contador y barra
            labelPlaybackTime.Text = "0:00  /  0:00";
            trackBarPlayback.Value = 0;

            // Limpiar gráficas
            panelWaveform.BackgroundImage = null;
        }

        private void trackBarPlayback_Scroll(object sender, EventArgs e)
        {
            player.Seek(TimeSpan.FromSeconds(trackBarPlayback.Value));
        }

        // ===== TAB 3: COMPARACIÓN =====
        // private AudioRecorder comparatorRecorder;
        // private List<AtmFileManager.SpectrumFrame> referenceSpectrumFrames;
        // private AtmFileManager.SpectrumFrame testSpectrumLatest;
        // private List<float> comparatorAudioSamples;

        private void btnLoadReference_Click(object sender, EventArgs e)
        {
            using (OpenFileDialog dialog = new OpenFileDialog())
            {
                dialog.Filter = "Autrum Files (*.atm)|*.atm";
                if (dialog.ShowDialog() == DialogResult.OK)
                {
                    if (fileManager.LoadFromAtm(dialog.FileName, out string audioPath, out _, out referenceSpectrumFrames))
                    {
                        referenceAudioPath = audioPath;
                        referenceAudioSamples = LoadAudioSamples(audioPath);
                        labelReferenceFile.Text = Path.GetFileName(dialog.FileName);
                        btnLoadTest.Enabled = true;
                    }
                    else
                    {
                        MessageBox.Show("Error al cargar archivo .atm", "Error");
                    }
                }
            }
        }

        private void btnLoadTest_Click(object sender, EventArgs e)
        {
            // Inicializar grabador para comparación si no existe
            if (comparatorRecorder == null)
            {
                comparatorRecorder = new AudioRecorder();
                comparatorRecorder.DataAvailable += ComparatorRecorder_DataAvailable;
                comparatorRecorder.BufferReady += ComparatorRecorder_BufferReady;
            }

            // Iniciar grabación
            string path = Path.Combine(Path.GetTempPath(), "autrum_test_recording.wav");
            comparatorAudioSamples = new List<float>();
            comparatorRecorder.StartRecording(path);
            
            // Ocultar botón "Cargar/Grabar" y mostrar "Stop" + "Retry"
            btnLoadTest.Visible = false;
            btnStopComparator.Visible = true;
            btnRetryComparator.Visible = true;
            
            // Deshabilitar Compare hasta que se presione Stop
            btnCompare.Enabled = false;
            
            labelTestFile.Text = "Grabando nuevo audio...";
        }

        /// <summary>
        /// Detiene la grabación del audio de prueba para comparación.
        /// Al presionar STOP, se habilita el botón COMPARAR.
        /// </summary>
        private void btnStopComparator_Click(object sender, EventArgs e)
        {
            if (comparatorRecorder == null) return;

            // Detener grabación inmediatamente
            comparatorRecorder.StopRecording();
            
            labelTestFile.Text = "Audio de prueba grabado. Presiona 'Compare' para analizar.";
            
            // Ocultar botones Stop/Retry
            btnStopComparator.Visible = false;
            btnRetryComparator.Visible = false;
            btnLoadTest.Visible = true;
            
            // Habilitar botón Compare para que usuario pueda comparar ahora
            btnCompare.Enabled = true;
            btnCompare.ForeColor = Color.DarkGreen;
            btnCompare.Font = new Font("Arial", 9, FontStyle.Bold);
        }

        /// <summary>
        /// Reinicia la grabación sin haber guardado la anterior.
        /// Vuelve a mostrar "Stop" y "Retry", deshabilitando "Compare".
        /// </summary>
        private void btnRetryComparator_Click(object sender, EventArgs e)
        {
            if (comparatorRecorder == null) return;

            // Detener grabación actual
            comparatorRecorder.StopRecording();

            // Reiniciar grabación desde cero
            string path = Path.Combine(Path.GetTempPath(), "autrum_test_recording.wav");
            comparatorAudioSamples = new List<float>();
            comparatorRecorder.StartRecording(path);
            
            labelTestFile.Text = "Regrabando audio...";
            btnCompare.Enabled = false;
        }

        private void ComparatorRecorder_DataAvailable(object sender, float[] samples)
        {
            // Acumular muestras de audio del comparador
            if (comparatorAudioSamples == null)
                comparatorAudioSamples = new List<float>();
            
            comparatorAudioSamples.AddRange(samples);
        }

        private void ComparatorRecorder_BufferReady(object sender, float[] buffer)
        {
            // Calcular FFT del buffer actual
            var spectrum = fftProcessor.ProcessAudio(buffer);
            testSpectrumLatest = new AtmFileManager.SpectrumFrame
            {
                TimeSeconds = 0,
                Frequencies = spectrum.Frequencies,
                Magnitudes = spectrum.Magnitudes
            };
        }

        private void btnCompare_Click(object sender, EventArgs e)
        {
            // Validar que se haya cargado una referencia

            if (referenceSpectrumFrames == null || referenceSpectrumFrames.Count == 0 ||
                referenceAudioSamples == null || referenceAudioSamples.Length == 0)
            {
                MessageBox.Show("Carga un archivo .atm referencia primero", "Error");
                return;
            }

            // Validar que se haya grabado audio de prueba

            if (comparatorRecorder == null || comparatorAudioSamples == null || comparatorAudioSamples.Count == 0)
            {
                MessageBox.Show("Graba audio de prueba primero", "Error");
                return;
            }

            // BÚSQUEDA TEMPORAL: Compara el espectro de prueba contra TODOS los puntos temporales
            // del audio de referencia para encontrar la mejor coincidencia
            
            float[] testSamples = comparatorAudioSamples.ToArray();

            ComparisonResult result = comparator.CompareWithTimeSearch(referenceAudioSamples, testSamples);

            // Mostrar resultados detallados
            string resultText = $"SIMILITUD GENERAL: {result.SimilarityScore:F2}%\n" +
                               $"  • Armónica (60% peso): {result.HarmonicScore:F2}%\n" +
                               $"  • Potencia (40% peso): {result.PowerScore:F2}%";

            if (result.TimeFoundSeconds >= 0)
            {
                int foundSecond = (int)result.TimeFoundSeconds;
                resultText += $"\n\n✓ ENCONTRADO en t={foundSecond}s del audio referencia";
                labelComparisonResult.Text = resultText;
                MessageBox.Show("¡Coincidencia encontrada!" + Environment.NewLine + resultText, "Resultado");

                if (!string.IsNullOrWhiteSpace(referenceAudioPath) && player.LoadAudio(referenceAudioPath))
                {
                    player.Seek(TimeSpan.FromSeconds(foundSecond));
                    player.Play();
                }
                else
                {
                    MessageBox.Show("No se pudo reproducir el audio de referencia desde el punto encontrado.", "Aviso");
                }
            }
            else
            {
                resultText += "\n\n✗ No se encontró coincidencia significativa";
                labelComparisonResult.Text = resultText;
                MessageBox.Show("No se encontró coincidencia significativa", "Resultado");
            }
            
            // Permitir grabar nuevo audio para comparar
            btnLoadTest.Visible = true;
            btnStopComparator.Visible = false;
            btnRetryComparator.Visible = false;
            btnCompare.Enabled = false;
            btnCompare.ForeColor = SystemColors.ControlText;
            btnCompare.Font = new Font("Arial", 9, FontStyle.Regular);
        }

        private float[] CombineSpectrumMagnitudes(List<AtmFileManager.SpectrumFrame> frames)
        {
            if (frames == null || frames.Count == 0) return new float[0];
            
            // Promediar todas las magnitudes
            float[] combined = new float[frames[0].Magnitudes.Length];
            for (int i = 0; i < combined.Length; i++)
            {
                float sum = 0;
                for (int j = 0; j < frames.Count; j++)
                {
                    if (i < frames[j].Magnitudes.Length)
                        sum += frames[j].Magnitudes[i];
                }
                combined[i] = sum / frames.Count;
            }
            return combined;
        }

        // ===== UTILIDADES: VISUALIZACIÓN GRÁFICA =====
        
        // Almacenar datos de audio para dibujar onda
        private object lastAudioSamples;

        private void UpdateSpectrumDisplay(Panel panel, SpectrumData spectrum)
        {
            if (panel == null || spectrum == null) return;

            // Dibujar el espectro FFT
            Graphics g = panel.CreateGraphics();
            try
            {
                DrawSpectrum(g, panel, spectrum);
            }
            finally
            {
                g?.Dispose();
            }
        }

        private void DrawSpectrum(Graphics g, Panel panel, SpectrumData spectrum)
        {
            if (spectrum.Frequencies.Length == 0 || spectrum.Magnitudes.Length == 0)
                return;

            // Limpiar panel
            g.Clear(Color.Black);

            int width = panel.Width;
            int height = panel.Height;
            float maxFreq = spectrum.Frequencies[spectrum.Frequencies.Length - 1];
            float maxMagnitude = spectrum.Magnitudes.Max();
            float minMagnitude = spectrum.Magnitudes.Min();

            using (Pen pen = new Pen(Color.Lime, 1))
            {
                for (int i = 0; i < spectrum.Frequencies.Length - 1; i++)
                {
                    // Convertir a píxeles
                    int x1 = (int)((spectrum.Frequencies[i] / maxFreq) * width);
                    int x2 = (int)((spectrum.Frequencies[i + 1] / maxFreq) * width);

                    float normalizedMagnitude1 = (spectrum.Magnitudes[i] - minMagnitude) / (maxMagnitude - minMagnitude + 1e-6f);
                    float normalizedMagnitude2 = (spectrum.Magnitudes[i + 1] - minMagnitude) / (maxMagnitude - minMagnitude + 1e-6f);

                    int y1 = height - (int)(normalizedMagnitude1 * height);
                    int y2 = height - (int)(normalizedMagnitude2 * height);

                    if (x1 >= 0 && x1 < width && x2 >= 0 && x2 < width)
                    {
                        g.DrawLine(pen, x1, y1, x2, y2);
                    }
                }
            }

            // Dibujar ejes
            using (Pen axisPen = new Pen(Color.White, 1))
            {
                g.DrawLine(axisPen, 0, height - 1, width, height - 1); // X
                g.DrawLine(axisPen, 0, 0, 0, height); // Y
            }

            // Etiquetas
            using (Font font = new Font("Arial", 8))
            using (Brush textBrush = new SolidBrush(Color.White))
            {
                g.DrawString("Frecuencia (Hz)", font, textBrush, width - 100, height - 20);
                g.DrawString("Magnitud (dB)", font, textBrush, 5, 5);
            }
        }

        private void DrawWaveform(Graphics g, Panel panel, float[] audioSamples)
        {
            if (audioSamples == null || audioSamples.Length == 0)
                return;

            // Limpiar panel
            g.Clear(Color.Black);

            int width = panel.Width;
            int height = panel.Height;
            int centerY = height / 2;

            // Encontrar amplitud máxima
            float maxAmplitude = 0;
            foreach (float sample in audioSamples)
            {
                if (Math.Abs(sample) > maxAmplitude)
                    maxAmplitude = Math.Abs(sample);
            }

            if (maxAmplitude == 0) maxAmplitude = 1;

            using (Pen pen = new Pen(Color.Cyan, 1))
            {
                // Dibujar línea central
                using (Pen centerLine = new Pen(Color.Gray, 1))
                {
                    centerLine.DashStyle = DashStyle.Dash;
                    g.DrawLine(centerLine, 0, centerY, width, centerY);
                }

                // Dibujar onda
                int samplesPerPixel = Math.Max(1, audioSamples.Length / width);
                
                for (int x = 0; x < width - 1; x++)
                {
                    int sampleIndex1 = x * samplesPerPixel;
                    int sampleIndex2 = (x + 1) * samplesPerPixel;

                    if (sampleIndex1 >= audioSamples.Length) break;
                    if (sampleIndex2 >= audioSamples.Length) sampleIndex2 = audioSamples.Length - 1;

                    float sample1 = audioSamples[sampleIndex1];
                    float sample2 = audioSamples[sampleIndex2];

                    int y1 = centerY - (int)((sample1 / maxAmplitude) * (centerY - 10));
                    int y2 = centerY - (int)((sample2 / maxAmplitude) * (centerY - 10));

                    g.DrawLine(pen, x, y1, x + 1, y2);
                }
            }

            // Dibujar ejes
            using (Pen axisPen = new Pen(Color.White, 1))
            {
                g.DrawLine(axisPen, 0, centerY, width, centerY); // X
                g.DrawLine(axisPen, 0, 0, 0, height); // Y
            }

            // Etiquetas
            using (Font font = new Font("Arial", 8))
            using (Brush textBrush = new SolidBrush(Color.White))
            {
                g.DrawString("Tiempo", font, textBrush, width - 50, centerY + 5);
                g.DrawString("Amplitud", font, textBrush, 5, 5);
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            recorder?.Dispose();
            player?.Dispose();
            base.OnFormClosing(e);
        }
    }
}
