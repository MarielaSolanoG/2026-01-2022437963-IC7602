using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text.Json;

namespace Autrum
{
    public class AtmFileManager
    {
        private const string AudioEntryName = "audio.wav";
        private const string MetadataEntryName = "metadata.json";
        private const string SpectrumEntryName = "spectrum.json";

        public class AtmMetadata
        {
            public string AudioFormat { get; set; } = "WAV";
            public int SampleRate { get; set; }
            public int Channels { get; set; }
            public float Duration { get; set; }
            public DateTime RecordedDate { get; set; }
        }

        public class SpectrumFrame
        {
            public float TimeSeconds { get; set; }
            public float[] Frequencies { get; set; } = Array.Empty<float>();
            public float[] Magnitudes { get; set; } = Array.Empty<float>();
        }

        public bool SaveAsAtm(
            string audioPath,
            string outputAtmPath,
            AtmMetadata metadata,
            List<SpectrumFrame> spectrumFrames)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(audioPath) || !File.Exists(audioPath))
                    return false;

                string? outputDir = Path.GetDirectoryName(outputAtmPath);
                if (!string.IsNullOrWhiteSpace(outputDir))
                {
                    Directory.CreateDirectory(outputDir);
                }

                if (File.Exists(outputAtmPath))
                {
                    File.Delete(outputAtmPath);
                }

                using ZipArchive archive = ZipFile.Open(outputAtmPath, ZipArchiveMode.Create);

                archive.CreateEntryFromFile(audioPath, AudioEntryName);

                ZipArchiveEntry metadataEntry = archive.CreateEntry(MetadataEntryName);
                using (Stream metadataStream = metadataEntry.Open())
                {
                    JsonSerializer.Serialize(metadataStream, metadata);
                }

                ZipArchiveEntry spectrumEntry = archive.CreateEntry(SpectrumEntryName);
                using (Stream spectrumStream = spectrumEntry.Open())
                {
                    JsonSerializer.Serialize(spectrumStream, spectrumFrames);
                }

                return true;
            }
            catch
            {
                return false;
            }
        }

        public bool LoadFromAtm(
            string atmPath,
            out string extractedAudioPath,
            out AtmMetadata metadata,
            out List<SpectrumFrame> spectrumFrames)
        {
            extractedAudioPath = string.Empty;
            metadata = new AtmMetadata();
            spectrumFrames = new List<SpectrumFrame>();

            try
            {
                if (string.IsNullOrWhiteSpace(atmPath) || !File.Exists(atmPath))
                    return false;

                string extractRoot = Path.Combine(
                    Path.GetTempPath(),
                    "Autrum",
                    Path.GetFileNameWithoutExtension(atmPath) + "_" + Guid.NewGuid().ToString("N"));

                Directory.CreateDirectory(extractRoot);

                using ZipArchive archive = ZipFile.OpenRead(atmPath);

                ZipArchiveEntry? audioEntry = archive.GetEntry(AudioEntryName);
                ZipArchiveEntry? metadataEntry = archive.GetEntry(MetadataEntryName);
                ZipArchiveEntry? spectrumEntry = archive.GetEntry(SpectrumEntryName);

                if (audioEntry == null || metadataEntry == null || spectrumEntry == null)
                    return false;

                extractedAudioPath = Path.Combine(extractRoot, AudioEntryName);
                audioEntry.ExtractToFile(extractedAudioPath, true);

                using (Stream metadataStream = metadataEntry.Open())
                {
                    AtmMetadata? loadedMetadata = JsonSerializer.Deserialize<AtmMetadata>(metadataStream);
                    metadata = loadedMetadata ?? new AtmMetadata();
                }

                using (Stream spectrumStream = spectrumEntry.Open())
                {
                    List<SpectrumFrame>? loadedFrames = JsonSerializer.Deserialize<List<SpectrumFrame>>(spectrumStream);
                    spectrumFrames = loadedFrames ?? new List<SpectrumFrame>();
                }

                return true;
            }
            catch
            {
                extractedAudioPath = string.Empty;
                metadata = new AtmMetadata();
                spectrumFrames = new List<SpectrumFrame>();
                return false;
            }
        }
    }
}
