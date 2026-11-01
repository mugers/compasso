import Link from "next/link";

export default function NotFound() {
  return (
    <div className="status">
      <h1>Task not found</h1>
      <p>It may have been deleted.</p>
      <Link href="/" className="btn">Back to the list</Link>
    </div>
  );
}
