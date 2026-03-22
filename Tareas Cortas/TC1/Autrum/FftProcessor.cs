using System;
using System.Collections.Generic;
using System.Linq;

namespace Autrum
{
    public class SpectrumData
    {
        public float[] Frequencies { get; set; }
        public float[] Magnitudes { get; set; }
    }

    public class FftProcessor
    {
        private const int FFT_SIZE = 2048;
        private const float SAMPLE_RATE = 44100f;

        public SpectrumData ProcessAudio(float[] audioSamples)
        {
            if (audioSamples.Length < FFT_SIZE)
                return new SpectrumData { Frequencies = new float[0], Magnitudes = new float[0] };

            // Aplicar ventana Hann
            float[] windowed = ApplyHannWindow(audioSamples, FFT_SIZE);

            // Realizar FFT (usar Radix-2 Cooley-Tukey)
            Complex[] fftResult = PerformFFT(windowed);

            // Calcular magnitudes en dB
            float[] frequencies = new float[fftResult.Length / 2];
            float[] magnitudes = new float[fftResult.Length / 2];

            for (int i = 0; i < frequencies.Length; i++)
            {
                frequencies[i] = (i * SAMPLE_RATE) / fftResult.Length;
                float magnitude = (float)Math.Sqrt(fftResult[i].Real * fftResult[i].Real + 
                                                    fftResult[i].Imaginary * fftResult[i].Imaginary);
                magnitudes[i] = 20 * (float)Math.Log10(magnitude + 1e-10f);
            }

            return new SpectrumData
            {
                Frequencies = frequencies,
                Magnitudes = magnitudes
            };
        }

        private float[] ApplyHannWindow(float[] samples, int size)
        {
            float[] windowed = new float[size];
            for (int i = 0; i < size && i < samples.Length; i++)
            {
                float window = 0.5f * (1 - (float)Math.Cos(2 * Math.PI * i / (size - 1)));
                windowed[i] = samples[i] * window;
            }
            return windowed;
        }

        private Complex[] PerformFFT(float[] input)
        {
            int n = input.Length;
            Complex[] values = new Complex[n];

            for (int i = 0; i < n; i++)
                values[i] = new Complex { Real = input[i], Imaginary = 0 };

            return FFTRadix2(values);
        }

        private Complex[] FFTRadix2(Complex[] input)
        {
            int n = input.Length;

            if (n <= 1)
                return input;

            // Dividir en pares e impares
            Complex[] even = new Complex[n / 2];
            Complex[] odd = new Complex[n / 2];

            for (int i = 0; i < n / 2; i++)
            {
                even[i] = input[2 * i];
                odd[i] = input[2 * i + 1];
            }

            Complex[] evenFFT = FFTRadix2(even);
            Complex[] oddFFT = FFTRadix2(odd);

            Complex[] result = new Complex[n];

            for (int k = 0; k < n / 2; k++)
            {
                float angle = -2f * (float)Math.PI * k / n;
                Complex w = new Complex
                {
                    Real = (float)Math.Cos(angle),
                    Imaginary = (float)Math.Sin(angle)
                };

                Complex t = Multiply(w, oddFFT[k]);
                result[k] = Add(evenFFT[k], t);
                result[k + n / 2] = Subtract(evenFFT[k], t);
            }

            return result;
        }

        private Complex Add(Complex a, Complex b) => new Complex { Real = a.Real + b.Real, Imaginary = a.Imaginary + b.Imaginary };
        private Complex Subtract(Complex a, Complex b) => new Complex { Real = a.Real - b.Real, Imaginary = a.Imaginary - b.Imaginary };
        private Complex Multiply(Complex a, Complex b) => new Complex { Real = a.Real * b.Real - a.Imaginary * b.Imaginary, Imaginary = a.Real * b.Imaginary + a.Imaginary * b.Real };

        private struct Complex
        {
            public float Real;
            public float Imaginary;
        }
    }
}
