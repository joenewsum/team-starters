"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-navy px-5 py-2 font-semibold text-white hover:bg-navy-2 print:hidden"
    >
      Download PDF
    </button>
  );
}
