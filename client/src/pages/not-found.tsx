import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <p className="text-4xl">🔍</p>
      <h2 className="text-xl font-bold">דף לא נמצא</h2>
      <Link href="/">
        <Button variant="outline">חזרה לדף הבית</Button>
      </Link>
    </div>
  );
}
