using System;
using System.IO;
using System.Runtime.InteropServices;

namespace RawPrinterApp {
    public class RawPrinterHelper {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public class DOCINFOA {
            [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
            [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
            [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
        }

        [DllImport(winspool.Drv, EntryPoint = OpenPrinterA, SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

        [DllImport(winspool.Drv, EntryPoint = ClosePrinter, SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport(winspool.Drv, EntryPoint = StartDocPrinterA, SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

        [DllImport(winspool.Drv, EntryPoint = EndDocPrinter, SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport(winspool.Drv, EntryPoint = StartPagePrinter, SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport(winspool.Drv, EntryPoint = EndPagePrinter, SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport(winspool.Drv, EntryPoint = WritePrinter, SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

        public static bool SendFileToPrinter(string szPrinterName, string szFileName) {
            if (!File.Exists(szFileName)) return false;
            byte[] bytes = File.ReadAllBytes(szFileName);
            return SendBytesToPrinter(szPrinterName, bytes);
        }

        public static bool SendBytesToPrinter(string szPrinterName, byte[] bytes) {
            IntPtr hPrinter = IntPtr.Zero;
            DOCINFOA di = new DOCINFOA();
            di.pDocName = KOT_TICKET_RAW;
            di.pDataType = RAW;

            if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
                if (StartDocPrinter(hPrinter, 1, di) != 0) {
                    if (StartPagePrinter(hPrinter)) {
                        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                        int dwWritten = 0;
                        bool bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                        Marshal.FreeCoTaskMem(pUnmanagedBytes);
                        EndPagePrinter(hPrinter);
                        EndDocPrinter(hPrinter);
                        ClosePrinter(hPrinter);
                        return bSuccess;
                    }
                    EndDocPrinter(hPrinter);
                }
                ClosePrinter(hPrinter);
            }
            return false;
        }

        public static int Main(string[] args) {
            if (args.Length < 2) {
                Console.WriteLine(Usage: RawPrinter.exe <PrinterName> <FilePath>);
                return 1;
            }
            string printerName = args[0];
            string filePath = args[1];

            bool ok = SendFileToPrinter(printerName, filePath);
            if (ok) {
                Console.WriteLine(SUCCESS);
                return 0;
            } else {
                Console.WriteLine(ERROR: Could not send raw data to printer  + printerName);
                return 2;
            }
        }
    }
}
