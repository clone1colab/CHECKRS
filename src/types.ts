export interface Student {
  id?: number;
  email: string;
  name: string;
  score: string;
  timestamp: string;
}

export interface QuestionResult {
  columnHeader: string;
  matchKey: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean | null;
}

export interface LookupResult {
  student: Student;
  results: {
    correctCount: number;
    totalQuestions: number;
    questionsCheckedCount: number;
    questions: QuestionResult[];
  };
}

export interface AppConfig {
  sheet1Url: string;
  sheet2Url: string;
  hasDirectSheet1: boolean;
  hasDirectSheet2: boolean;
}

export interface AdminStats {
  totalStudents: number;
  totalAnswerKeys: number;
  studentHeaders: string[];
  answerHeaders: string[];
  emailColumnFound: string;
  nameColumnFound: string;
  scoreColumnFound: string;
  s1Source: string;
  s2Source: string;
}
