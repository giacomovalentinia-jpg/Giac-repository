"use client";

import { useState } from "react";

type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export default function QuizPanel({ onQuestionUsed }: { onQuestionUsed: () => void }) {
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAnswers({});
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic || undefined }),
      });
      onQuestionUsed();
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore nella generazione del quiz");
        setQuestions(null);
        return;
      }
      setQuestions(data.questions);
    } catch {
      setError("Errore di rete, riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Quiz di calcio</h2>
      <form className="chat-input-row" onSubmit={handleGenerate}>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Argomento (es. Serie A anni '90)"
          disabled={loading}
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Genero..." : "Genera quiz"}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      {questions?.map((q, qi) => {
        const answered = answers[qi];
        return (
          <div className="quiz-question" key={qi}>
            <strong>
              {qi + 1}. {q.question}
            </strong>
            <div className="quiz-options">
              {q.options.map((opt, oi) => {
                let cls = "quiz-option";
                if (answered !== undefined) {
                  if (oi === q.correctIndex) cls += " correct";
                  else if (oi === answered) cls += " wrong";
                }
                return (
                  <button
                    type="button"
                    key={oi}
                    className={cls}
                    disabled={answered !== undefined}
                    onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered !== undefined && <p className="quiz-explanation">{q.explanation}</p>}
          </div>
        );
      })}
    </div>
  );
}
