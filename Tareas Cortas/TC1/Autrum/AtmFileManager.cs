using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text.Json;

namespace Autrum
{
    public class AtmFileManager
    {
        public class AtmMetadata
        {
            public string AudioFormat { get; set; }
            public int SampleRate { get; set; }
            public int Channels { get; set; }
            public float Duration { get; set; }
            public DateTime RecordedDate { get; set; }
        }

        public class SpectrumFrame
        {
            public float TimeSeconds { get; set; }
            public float[] Frequencies { get; set; }
            public float[] Magnitudes { get; set; }
        }

        public bool SaveAsAtm(string audioPath, string outputPath, AtmMetadata metadata, 
                              List<SpectrumFrame> spectrumFrames)
        {
            try
            {
                using (var zipArchive = ZipFile.Open(outputPath, ZipArchiveMode.Create))
                {
                    // Agregar archivo de audio
                    if (File.Exists(audioPath))
                    {
                        zipArchive.CreateEntryFromFile(audioPath, "audio.wav");
                    }

                    // Agregar metadatos como JSON
                    var metadataEntry = zipArchive.CreateEntry("metadata.json");
                    using (var writer = new StreamWriter(metadataEntry.Open()))
                    {
                        string json = JsonSerializer.Serialize(metadata, 
                            new JsonSerializerOptions { WriteIndented = true });
                        writer.Write(json);
                    }

                    // Agregar espectros como JSON
                    if (spectrumFrames != null && spectrumFrames.Count > 0)
                    {
                        var spectrumEntry = zipArchive.CreateEntry("spectrum.json");
                        using (var writer = new StreamWriter(spectrumEntry.Open()))
                        {
                            string json = JsonSerializer.Serialize(spectrumFrames, 
                                new JsonSerializerOptions { WriteIndented = true });
                            writer.Write(json);
                        }
                    }
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        public bool LoadFromAtm(string atmPath, out string audioPath, out AtmMetadata metadata, 
                                out List<SpectrumFrame> spectrumFrames)
        {
            audioPath = null;
            metadata = null;
            spectrumFrames = null;
            string tempDir = Path.Combine(Path.GetTempPath(), "autrum_temp_" + Guid.NewGuid().ToString());

            try
            {
                Directory.CreateDirectory(tempDir);

                using (var zipArchive = ZipFile.OpenRead(atmPath))
                {
                    // Extraer audio
                    var audioEntry = zipArchive.GetEntry("audio.wav");
                    if (audioEntry == null) return false;

                    audioPath = Path.Combine(tempDir, "audio.wav");
                    audioEntry.ExtractToFile(audioPath, true);

                    // Extraer y parsear metadatos
                    var metadataEntry = zipArchive.GetEntry("metadata.json");
                    if (metadataEntry != null)
                    {
                        using (var reader = new StreamReader(metadataEntry.Open()))
                        {
                            string json = reader.ReadToEnd();
                            metadata = JsonSerializer.Deserialize<AtmMetadata>(json);
                        }
                    }

                    // Extraer espectros
                    var spectrumEntry = zipArchive.GetEntry("spectrum.json");
                    if (spectrumEntry != null)
                    {
                        using (var reader = new StreamReader(spectrumEntry.Open()))
                        {
                            string json = reader.ReadToEnd();
                            spectrumFrames = JsonSerializer.Deserialize<List<SpectrumFrame>>(json);
                        }
                    }
                }

                return true;
            }
            catch
            {
                return false;
            }
        }

        // Método para compatibilidad con código antiguo
        public bool SaveAsAtm(string audioPath, string outputPath, AtmMetadata metadata)
        {
            return SaveAsAtm(audioPath, outputPath, metadata, null);
        }

        // Método para compatibilidad con código antiguo
        public bool LoadFromAtm(string atmPath, out string audioPath, out AtmMetadata metadata)
        {
            List<SpectrumFrame> dummy;
            return LoadFromAtm(atmPath, out audioPath, out metadata, out dummy);
        }
    }
}
