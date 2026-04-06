using System;
using System.Drawing;
using System.Windows.Forms;

namespace Autrum
{
    partial class MainForm
    {
        private System.ComponentModel.IContainer components = null;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            tabControl1 = new TabControl();
            tabPageAnalysis = new TabPage();
            tabPagePlayback = new TabPage();
            tabPageComparison = new TabPage();

            // TAB 1: ANALYSIS
            btnStartRecording = new Button();
            btnStopRecording = new Button();
            btnPauseRecording = new Button();
            btnContinueRecording = new Button();
            btnSaveAnalysis = new Button();
            btnLoadWav = new Button();
            labelRecordingStatus = new Label();
            panelSpectrumAnalysis = new Panel();

            // TAB 2: PLAYBACK
            btnLoadAudio = new Button();
            btnPlay = new Button();
            btnPause = new Button();
            btnStop = new Button();
            labelAudioPath = new Label();
            labelPlaybackTime = new Label();
            trackBarPlayback = new TrackBar();
            panelWaveform = new Panel();

            // TAB 3: COMPARISON
            btnLoadReference = new Button();
            btnLoadTest = new Button();
            btnStopComparator = new Button();
            btnRetryComparator = new Button();
            btnCompare = new Button();
            labelReferenceFile = new Label();
            labelTestFile = new Label();
            labelComparisonResult = new Label();

            SuspendLayout();

            // Form
            this.Text = "AUTRUM";
            this.Size = new Size(1000, 600);
            this.StartPosition = FormStartPosition.CenterScreen;

            // Tab Control
            tabControl1.Location = new Point(10, 10);
            tabControl1.Size = new Size(970, 540);
            tabControl1.TabPages.AddRange(new[] { tabPageAnalysis, tabPagePlayback, tabPageComparison });

            // ===== TAB 1: ANALYSIS =====
            // Fila de botones: [Start] [Stop] [Pausar] [Continuar] [Save as .atm]
            // Posiciones: 10, 170, 330, 440, 560
            tabPageAnalysis.Text = "Analysis";

            btnStartRecording.Text = "Start Recording";
            btnStartRecording.Location = new Point(10, 10);
            btnStartRecording.Size = new Size(150, 30);
            btnStartRecording.Click += btnStartRecording_Click;

            btnStopRecording.Text = "Stop Recording";
            btnStopRecording.Location = new Point(170, 10);
            btnStopRecording.Size = new Size(150, 30);
            btnStopRecording.Enabled = false;
            btnStopRecording.Click += btnStopRecording_Click;

            btnPauseRecording.Text = "⏸ Pause";
            btnPauseRecording.Location = new Point(330, 10);
            btnPauseRecording.Size = new Size(100, 30);
            btnPauseRecording.Enabled = false;
            btnPauseRecording.Click += btnPauseRecording_Click;

            btnContinueRecording.Text = "▶ Continue";
            btnContinueRecording.Location = new Point(440, 10);
            btnContinueRecording.Size = new Size(110, 30);
            btnContinueRecording.Enabled = false;
            btnContinueRecording.Click += btnContinueRecording_Click;

            btnSaveAnalysis.Text = "Save as .atm";
            btnSaveAnalysis.Location = new Point(560, 10);
            btnSaveAnalysis.Size = new Size(150, 30);
            btnSaveAnalysis.Enabled = false;
            btnSaveAnalysis.Click += btnSaveAnalysis_Click;

            btnLoadWav.Text = "Load WAV";
            btnLoadWav.Location = new Point(720, 10);
            btnLoadWav.Size = new Size(100, 30);
            btnLoadWav.Click += btnLoadWav_Click;

            labelRecordingStatus.Text = "Ready";
            labelRecordingStatus.Location = new Point(10, 50);
            labelRecordingStatus.Size = new Size(500, 20);

            panelSpectrumAnalysis.Location = new Point(10, 80);
            panelSpectrumAnalysis.Size = new Size(930, 350);
            panelSpectrumAnalysis.BackColor = Color.Black;
            panelSpectrumAnalysis.BorderStyle = BorderStyle.Fixed3D;

            tabPageAnalysis.Controls.AddRange(new Control[] {
                btnStartRecording,
                btnStopRecording,
                btnPauseRecording,
                btnContinueRecording,
                btnSaveAnalysis,
                btnLoadWav,
                labelRecordingStatus,
                panelSpectrumAnalysis
            });

            // ===== TAB 2: PLAYBACK =====
            tabPagePlayback.Text = "Playback";

            btnLoadAudio.Text = "Load Audio";
            btnLoadAudio.Location = new Point(10, 10);
            btnLoadAudio.Size = new Size(100, 30);
            btnLoadAudio.Click += btnLoadAudio_Click;

            btnPlay.Text = "Play";
            btnPlay.Location = new Point(120, 10);
            btnPlay.Size = new Size(80, 30);
            btnPlay.Enabled = false;
            btnPlay.Click += btnPlay_Click;

            btnPause.Text = "Pause";
            btnPause.Location = new Point(210, 10);
            btnPause.Size = new Size(80, 30);
            btnPause.Enabled = false;
            btnPause.Click += btnPause_Click;

            btnStop.Text = "Restart";
            btnStop.Location = new Point(300, 10);
            btnStop.Size = new Size(80, 30);
            btnStop.Click += btnStop_Click;

            labelAudioPath.Text = "No file loaded";
            labelAudioPath.Location = new Point(10, 50);
            labelAudioPath.Size = new Size(500, 20);

            trackBarPlayback.Location = new Point(10, 80);
            trackBarPlayback.Size = new Size(930, 30);
            trackBarPlayback.Scroll += trackBarPlayback_Scroll;

            labelPlaybackTime.Text = "0:00  /  0:00";
            labelPlaybackTime.Location = new Point(10, 140);
            labelPlaybackTime.Size = new Size(300, 30);
            labelPlaybackTime.Font = new Font("Arial", 14, FontStyle.Bold);
            labelPlaybackTime.ForeColor = Color.White;
            labelPlaybackTime.BackColor = Color.Black;

            panelWaveform.Location = new Point(10, 180);
            panelWaveform.Size = new Size(930, 250);
            panelWaveform.BackColor = Color.Black;
            panelWaveform.BorderStyle = BorderStyle.Fixed3D;

            tabPagePlayback.Controls.AddRange(new Control[] {
                btnLoadAudio, btnPlay, btnPause, btnStop,
                labelAudioPath, trackBarPlayback, labelPlaybackTime, panelWaveform
            });

            // ===== TAB 3: COMPARISON =====
            tabPageComparison.Text = "Comparison";

            btnLoadReference.Text = "Load Reference";
            btnLoadReference.Location = new Point(10, 10);
            btnLoadReference.Size = new Size(150, 30);
            btnLoadReference.Click += btnLoadReference_Click;

            labelReferenceFile.Text = "No reference loaded";
            labelReferenceFile.Location = new Point(170, 15);
            labelReferenceFile.Size = new Size(300, 20);

            btnLoadTest.Text = "Load Test";
            btnLoadTest.Location = new Point(10, 50);
            btnLoadTest.Size = new Size(150, 30);
            btnLoadTest.Click += btnLoadTest_Click;

            btnStopComparator.Text = "⏹ STOP";
            btnStopComparator.Location = new Point(10, 50);
            btnStopComparator.Size = new Size(100, 30);
            btnStopComparator.BackColor = Color.Red;
            btnStopComparator.ForeColor = Color.White;
            btnStopComparator.Font = new Font("Arial", 10, FontStyle.Bold);
            btnStopComparator.Visible = false;
            btnStopComparator.Click += btnStopComparator_Click;

            btnRetryComparator.Text = "↻ Retry";
            btnRetryComparator.Location = new Point(120, 50);
            btnRetryComparator.Size = new Size(100, 30);
            btnRetryComparator.BackColor = Color.Orange;
            btnRetryComparator.ForeColor = Color.White;
            btnRetryComparator.Font = new Font("Arial", 10, FontStyle.Bold);
            btnRetryComparator.Visible = false;
            btnRetryComparator.Click += btnRetryComparator_Click;

            labelTestFile.Text = "No test file loaded";
            labelTestFile.Location = new Point(170, 55);
            labelTestFile.Size = new Size(760, 20);

            btnCompare.Text = "Compare";
            btnCompare.Location = new Point(10, 90);
            btnCompare.Size = new Size(150, 30);
            btnCompare.Click += btnCompare_Click;

            labelComparisonResult.Text = "Click 'Compare' to analyze";
            labelComparisonResult.Location = new Point(170, 90);
            labelComparisonResult.Size = new Size(500, 80);
            labelComparisonResult.BorderStyle = BorderStyle.Fixed3D;

            tabPageComparison.Controls.AddRange(new Control[] {
                btnLoadReference, labelReferenceFile,
                btnLoadTest, btnStopComparator, btnRetryComparator,
                labelTestFile, btnCompare, labelComparisonResult
            });

            // Agregar a form
            this.Controls.Add(tabControl1);
            ResumeLayout(false);
        }

        // Componentes globales
        private TabControl tabControl1;
        private TabPage tabPageAnalysis;
        private TabPage tabPagePlayback;
        private TabPage tabPageComparison;

        // Tab 1
        private Button btnStartRecording;
        private Button btnStopRecording;
        private Button btnPauseRecording;
        private Button btnContinueRecording;
        private Button btnSaveAnalysis;
        private Button btnLoadWav;
        private Label labelRecordingStatus;
        private Panel panelSpectrumAnalysis;

        // Tab 2
        private Button btnLoadAudio;
        private Button btnPlay;
        private Button btnPause;
        private Button btnStop;
        private Label labelAudioPath;
        private Label labelPlaybackTime;
        private TrackBar trackBarPlayback;
        private Panel panelWaveform;

        // Tab 3
        private Button btnLoadReference;
        private Button btnLoadTest;
        private Button btnStopComparator;
        private Button btnRetryComparator;
        private Button btnCompare;
        private Label labelReferenceFile;
        private Label labelTestFile;
        private Label labelComparisonResult;
    }
}