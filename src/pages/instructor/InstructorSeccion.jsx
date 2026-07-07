import { ClipboardCheck } from "lucide-react";
import "./instructor.css";

export default function InstructorSeccion({ titulo, descripcion }) {
  return (
    <section className="instructor-placeholder">
      <div className="instructor-placeholder-icon">
        <ClipboardCheck size={34} />
      </div>
      <h1>{titulo}</h1>
      <p>{descripcion}</p>
    </section>
  );
}
