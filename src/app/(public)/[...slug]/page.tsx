import { notFound } from "next/navigation";

// Tangkap URL yang tidak dikenal agar 404 dirender di dalam layout publik (header, nav, footer).
export default function TidakDitemukan() {
  notFound();
}
