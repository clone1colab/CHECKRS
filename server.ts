import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const CONFIG_FILE = path.join(process.cwd(), "data-config.json");

interface AppConfig {
  sheet1Url: string;
  sheet2Url: string;
  adminPassword?: string;
  directSheet1Data?: string;
  directSheet2Data?: string;
}

const DEFAULT_CONFIG: AppConfig = {
  sheet1Url: "https://docs.google.com/spreadsheets/d/17I-xLtznLlPCqP_EBiSS0nFmQ1IwfiCmMdRk5TcUs0w/export?format=csv&gid=1328052188",
  sheet2Url: "https://docs.google.com/spreadsheets/d/1ls0Vj-JJO0PvMoYrtziZFyJyrs1rSdPuCsci2D4dwX8/export?format=csv",
  adminPassword: "admin",
  directSheet1Data: "",
  directSheet2Data: ""
};

// Initialize Firebase Admin with dynamic settings
let db: any = null;
let isDbHealthy = true;
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    if (getApps().length === 0) {
      initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
    try {
      db = getFirestore(databaseId);
    } catch (e) {
      db = getFirestore();
    }
    console.log(`Firebase Admin initialized successfully with database: ${databaseId}`);
  } else {
    console.warn("No firebase-applet-config.json found.");
  }
} catch (err) {
  console.error("Failed to initialize Firebase Admin:", err);
}

// Initialize config file
function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      const config = JSON.parse(data);
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (err) {
    console.error("Error loading config:", err);
  }
  // Write default config
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing default config:", err);
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config: AppConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving config:", err);
    throw err;
  }
}

// Get config from Firestore (master) or fallback to local
async function getAppConfig(): Promise<AppConfig> {
  const localConfig = loadConfig();
  if (!db || !isDbHealthy) return localConfig;

  try {
    const docRef = db.collection("config").doc("main");
    const doc = await docRef.get();
    if (doc.exists) {
      return { ...DEFAULT_CONFIG, ...doc.data() } as AppConfig;
    } else {
      try {
        await docRef.set(localConfig);
      } catch (writeErr: any) {
        if (writeErr.message?.includes("PERMISSION_DENIED") || writeErr.code === 7) {
          isDbHealthy = false;
          console.warn("Firestore write access denied. Falling back to local storage.");
        }
      }
      return localConfig;
    }
  } catch (err: any) {
    console.error("Error loading config from Firestore:", err);
    if (err.message?.includes("PERMISSION_DENIED") || err.code === 7) {
      isDbHealthy = false;
      console.warn("Firestore access denied. Falling back permanently to local config storage.");
    }
    return localConfig;
  }
}

// Save config to local file AND Firestore
async function saveAppConfig(config: AppConfig): Promise<void> {
  saveConfig(config);
  if (!db || !isDbHealthy) return;

  try {
    await db.collection("config").doc("main").set(config);
    console.log("Configuration successfully synchronized with Firestore.");
  } catch (err: any) {
    console.error("Error saving config to Firestore:", err);
    if (err.message?.includes("PERMISSION_DENIED") || err.code === 7) {
      isDbHealthy = false;
      console.warn("Firestore access denied. Falling back permanently to local config storage.");
    } else {
      throw err;
    }
  }
}

// Simple robust CSV Parser
function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false; // End of quotes
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\r" || char === "\n") {
        row.push(cell);
        cell = "";
        if (row.length > 0 || cell !== "") {
          lines.push(row);
        }
        row = [];
        if (char === "\r" && nextChar === "\n") {
          i++; // Skip \n
        }
      } else {
        cell += char;
      }
    }
  }
  if (row.length > 0 || cell !== "") {
    row.push(cell);
    lines.push(row);
  }

  // Filter out completely empty rows
  return lines.filter(r => r.some(cell => cell.trim() !== ""));
}

// Fetch Google Sheet as CSV helper
async function fetchSheetData(url: string): Promise<string> {
  // If URL contains '/edit', we try to convert it to export CSV URL
  let fetchUrl = url.trim();
  if (fetchUrl.includes("/edit")) {
    const match = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      const spreadsheetId = match[1];
      const gidMatch = fetchUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      fetchUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    }
  }

  console.log(`Fetching from URL: ${fetchUrl}`);
  const response = await fetch(fetchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }

  const text = await response.text();
  // If we got HTML login page, it means sheet is private
  if (text.includes("<!DOCTYPE html>") && (text.includes("ServiceLogin") || text.includes("google-signin"))) {
    throw new Error("Tài liệu Google Sheets này riêng tư hoặc yêu cầu đăng nhập. Hãy đặt chế độ chia sẻ là 'Bất kỳ ai có liên kết đều có thể xem'.");
  }

  return text;
}

// Helper to normalize strings for comparison
function normalizeValue(val: string): string {
  return (val || "").trim().toLowerCase();
}

// Intelligent cell/column matching for headers
function findColumnIndices(headers: string[]) {
  let emailIdx = -1;
  let nameIdx = -1;
  let scoreIdx = -1;
  let timestampIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = normalizeValue(headers[i]);
    if (emailIdx === -1 && (h.includes("email") || h.includes("thư điện tử") || h.includes("địa chỉ mail"))) {
      emailIdx = i;
    } else if (nameIdx === -1 && (h.includes("họ và tên") || h.includes("họ tên") || h.includes("tên học sinh") || h.includes("tên thí sinh") || h.includes("họ & tên") || h === "tên" || h === "name")) {
      nameIdx = i;
    } else if (scoreIdx === -1 && (h.includes("điểm số") || h.includes("điểm") || h.includes("score") || h.includes("grade") || h.includes("kết quả"))) {
      scoreIdx = i;
    } else if (timestampIdx === -1 && (h.includes("timestamp") || h.includes("thời gian") || h.includes("ngày") || h.includes("giờ"))) {
      timestampIdx = i;
    }
  }

  // Backup lookups if exact matches weren't found
  if (emailIdx === -1) {
    // Look for any header containing @-like things or just "mail"
    emailIdx = headers.findIndex(h => normalizeValue(h).includes("mail"));
  }

  return { emailIdx, nameIdx, scoreIdx, timestampIdx };
}

// Compare student choice with correct key (highly robust)
function isCorrectAnswer(studentChoice: string, correctKey: string): boolean {
  const s = studentChoice.trim().toUpperCase();
  const c = correctKey.trim().toUpperCase();
  if (s === c) return true;
  if (!s || !c) return false;

  // Handles "A. Answer Content" vs "A" or "A" vs "A. Answer Content"
  const sLetterMatch = s.match(/^([A-D])[\s\.\-\:]/);
  const cLetterMatch = c.match(/^([A-D])[\s\.\-\:]/);

  const sLetter = sLetterMatch ? sLetterMatch[1] : s;
  const cLetter = cLetterMatch ? cLetterMatch[1] : c;

  if (sLetter === cLetter) return true;

  // Starts with check
  if (c.length === 1 && s.startsWith(c)) {
    const nextChar = s.charAt(1);
    if (!nextChar || /[\s\.\-\:]/.test(nextChar)) return true;
  }
  if (s.length === 1 && c.startsWith(s)) {
    const nextChar = c.charAt(1);
    if (!nextChar || /[\s\.\-\:]/.test(nextChar)) return true;
  }

  return false;
}

// Parse answer key sheet
// Sheet 2 can be:
// Format A: Question columns or STT / Câu and Đáp án đúng rows
// Format B: Header with question columns, row 1 contains keys
function parseAnswerKeys(csvRows: string[][]): Map<string, string> {
  const keyMap = new Map<string, string>();
  if (csvRows.length < 2) return keyMap;

  const headers = csvRows[0];
  
  // Let's check if there is a column for "câu" / "câu hỏi" / "question" and another for "đáp án" / "key"
  let questionColIdx = -1;
  let answerColIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = normalizeValue(headers[i]);
    if (questionColIdx === -1 && (h.includes("câu") || h.includes("stt") || h.includes("question") || h === "id" || h.includes("số thứ tự"))) {
      questionColIdx = i;
    } else if (answerColIdx === -1 && (h.includes("đáp án") || h.includes("đáp án đúng") || h.includes("key") || h.includes("answer") || h.includes("lựa chọn đúng"))) {
      answerColIdx = i;
    }
  }

  // If we found both columns, parse rows
  if (questionColIdx !== -1 && answerColIdx !== -1) {
    for (let r = 1; r < csvRows.length; r++) {
      const qVal = csvRows[r][questionColIdx];
      const aVal = csvRows[r][answerColIdx];
      if (qVal && aVal) {
        // Normalize question key like "Câu 1" to "Câu 1" or "1" to "Câu 1"
        const qNumMatch = qVal.match(/\d+/);
        const key = qNumMatch ? `Câu ${qNumMatch[0]}` : qVal.trim();
        keyMap.set(key, aVal.trim());
      }
    }
  } else {
    // If we couldn't find named columns, check if Column 0 is question number and Column 1 is answer
    if (csvRows[1] && csvRows[1].length >= 2) {
      for (let r = 1; r < csvRows.length; r++) {
        const qVal = csvRows[r][0];
        const aVal = csvRows[r][1];
        if (qVal && aVal) {
          const qNumMatch = qVal.match(/\d+/);
          const key = qNumMatch ? `Câu ${qNumMatch[0]}` : qVal.trim();
          keyMap.set(key, aVal.trim());
        }
      }
    }
  }

  return keyMap;
}

// API Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Admin verification & general info retrieval
app.post("/api/admin/verify", async (req, res) => {
  const { password } = req.body;
  const config = await getAppConfig();

  if (password !== config.adminPassword) {
    return res.status(401).json({ error: "Mật khẩu quản trị viên không chính xác!" });
  }

  try {
    // Fetch and check Sheet 1 data
    let s1Content = "";
    let s1Source = "direct";
    if (config.directSheet1Data) {
      s1Content = config.directSheet1Data;
    } else if (config.sheet1Url) {
      s1Content = await fetchSheetData(config.sheet1Url);
      s1Source = "google";
    }

    // Fetch and check Sheet 2 data
    let s2Content = "";
    let s2Source = "direct";
    if (config.directSheet2Data) {
      s2Content = config.directSheet2Data;
    } else if (config.sheet2Url) {
      s2Content = await fetchSheetData(config.sheet2Url);
      s2Source = "google";
    }

    const s1Rows = parseCSV(s1Content);
    const s2Rows = parseCSV(s2Content);

    const s1Headers = s1Rows[0] || [];
    const s2Headers = s2Rows[0] || [];

    const { emailIdx, nameIdx, scoreIdx, timestampIdx } = findColumnIndices(s1Headers);
    const keyMap = parseAnswerKeys(s2Rows);

    // Get list of students
    const students: any[] = [];
    if (s1Rows.length > 1) {
      for (let i = 1; i < s1Rows.length; i++) {
        const r = s1Rows[i];
        const email = emailIdx !== -1 ? r[emailIdx] : "";
        const name = nameIdx !== -1 ? r[nameIdx] : "";
        const score = scoreIdx !== -1 ? r[scoreIdx] : "";
        const timestamp = timestampIdx !== -1 ? r[timestampIdx] : "";

        if (email || name) {
          students.push({
            id: i,
            email: email ? email.trim() : "",
            name: name ? name.trim() : `Thí sinh ${i}`,
            score: score ? score.trim() : "",
            timestamp: timestamp ? timestamp.trim() : ""
          });
        }
      }
    }

    res.json({
      success: true,
      config: {
        sheet1Url: config.sheet1Url,
        sheet2Url: config.sheet2Url,
        hasDirectSheet1: !!config.directSheet1Data,
        hasDirectSheet2: !!config.directSheet2Data,
      },
      stats: {
        totalStudents: students.length,
        totalAnswerKeys: keyMap.size,
        studentHeaders: s1Headers,
        answerHeaders: s2Headers,
        emailColumnFound: emailIdx !== -1 ? s1Headers[emailIdx] : "Không tìm thấy",
        nameColumnFound: nameIdx !== -1 ? s1Headers[nameIdx] : "Không tìm thấy",
        scoreColumnFound: scoreIdx !== -1 ? s1Headers[scoreIdx] : "Không tìm thấy",
        s1Source,
        s2Source
      },
      students
    });

  } catch (error: any) {
    res.json({
      success: false,
      error: error.message || "Lỗi không xác định khi tải dữ liệu."
    });
  }
});

// Update configuration
app.post("/api/admin/save-config", async (req, res) => {
  const { password, sheet1Url, sheet2Url, directSheet1Data, directSheet2Data, adminPassword } = req.body;
  const currentConfig = await getAppConfig();

  if (password !== currentConfig.adminPassword) {
    return res.status(401).json({ error: "Mật khẩu quản trị viên không chính xác!" });
  }

  const updated: AppConfig = {
    sheet1Url: typeof sheet1Url === "string" ? sheet1Url : currentConfig.sheet1Url,
    sheet2Url: typeof sheet2Url === "string" ? sheet2Url : currentConfig.sheet2Url,
    directSheet1Data: typeof directSheet1Data === "string" ? directSheet1Data : currentConfig.directSheet1Data,
    directSheet2Data: typeof directSheet2Data === "string" ? directSheet2Data : currentConfig.directSheet2Data,
    adminPassword: typeof adminPassword === "string" && adminPassword ? adminPassword : currentConfig.adminPassword
  };

  try {
    await saveAppConfig(updated);
    res.json({ success: true, message: "Cấu hình đã được cập nhật thành công trên Firestore!" });
  } catch (err: any) {
    res.status(500).json({ error: "Không thể lưu cấu hình: " + err.message });
  }
});

// Bulk sync all students to Firestore for synchronized database lookups
app.post("/api/admin/sync-database", async (req, res) => {
  const { password } = req.body;
  const config = await getAppConfig();

  if (password !== config.adminPassword) {
    return res.status(401).json({ error: "Mật khẩu quản trị viên không chính xác!" });
  }

  if (!db || !isDbHealthy) {
    return res.status(500).json({ error: "Cơ sở dữ liệu Firestore chưa được khởi tạo hoặc thiếu quyền ghi (Permission Denied). Vui lòng cấu hình phân quyền đầy đủ cho Service Account." });
  }

  try {
    // 1. Fetch Sheet 1 (Students)
    let s1Content = "";
    if (config.directSheet1Data) {
      s1Content = config.directSheet1Data;
    } else if (config.sheet1Url) {
      s1Content = await fetchSheetData(config.sheet1Url);
    } else {
      return res.status(400).json({ error: "Chưa cấu hình nguồn dữ liệu học sinh." });
    }

    // 2. Fetch Sheet 2 (Keys)
    let s2Content = "";
    if (config.directSheet2Data) {
      s2Content = config.directSheet2Data;
    } else if (config.sheet2Url) {
      s2Content = await fetchSheetData(config.sheet2Url);
    } else {
      return res.status(400).json({ error: "Chưa cấu hình nguồn dữ liệu đáp án." });
    }

    const s1Rows = parseCSV(s1Content);
    const s2Rows = parseCSV(s2Content);

    if (s1Rows.length < 2) {
      return res.status(400).json({ error: "Danh sách điểm học sinh trống." });
    }

    const s1Headers = s1Rows[0];
    const { emailIdx, nameIdx, scoreIdx, timestampIdx } = findColumnIndices(s1Headers);

    if (emailIdx === -1) {
      return res.status(400).json({ error: "Không tìm thấy cột Email trong bảng dữ liệu." });
    }

    const keyMap = parseAnswerKeys(s2Rows);
    const collectionRef = db.collection("students");
    
    let processedCount = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (let i = 1; i < s1Rows.length; i++) {
      const studentRow = s1Rows[i];
      const emailRaw = studentRow[emailIdx];
      if (!emailRaw) continue;

      const email = emailRaw.trim().toLowerCase();
      if (!email) continue;

      const name = nameIdx !== -1 && studentRow[nameIdx] ? studentRow[nameIdx].trim() : "Học sinh";
      const timestamp = timestampIdx !== -1 && studentRow[timestampIdx] ? studentRow[timestampIdx].trim() : "";
      
      const questions: any[] = [];
      let correctCount = 0;
      let questionsCheckedCount = 0;

      for (let col = 0; col < s1Headers.length; col++) {
        if (col === timestampIdx || col === emailIdx || col === nameIdx || col === scoreIdx) {
          continue;
        }

        const colHeader = s1Headers[col].trim();
        if (!colHeader) continue;

        const studentAns = studentRow[col] ? studentRow[col].trim() : "";

        let matchKey = colHeader;
        const colNumMatch = colHeader.match(/(Câu\s*\d+|\d+)/i);
        if (colNumMatch) {
          const numPart = colNumMatch[1].match(/\d+/);
          matchKey = numPart ? `Câu ${numPart[0]}` : colHeader;
        }

        let correctAns = keyMap.get(matchKey) || "";
        if (!correctAns) {
          for (const [k, v] of keyMap.entries()) {
            const kNormalized = k.toLowerCase().replace(/\s+/g, "");
            const colHeaderNormalized = colHeader.toLowerCase().replace(/\s+/g, "");
            if (colHeaderNormalized.includes(kNormalized) || kNormalized.includes(colHeaderNormalized)) {
              correctAns = v;
              break;
            }
          }
        }

        const isCorrect = correctAns ? isCorrectAnswer(studentAns, correctAns) : null;
        if (isCorrect) {
          correctCount++;
        }
        if (correctAns) {
          questionsCheckedCount++;
        }

        questions.push({
          columnHeader: colHeader,
          matchKey,
          studentAnswer: studentAns,
          correctAnswer: correctAns || "Chưa có đáp án mẫu",
          isCorrect: correctAns ? isCorrect : null
        });
      }

      const scoreValue = scoreIdx !== -1 && studentRow[scoreIdx] ? studentRow[scoreIdx].trim() : `${correctCount}/${questionsCheckedCount}`;

      const studentData = {
        email,
        name,
        score: scoreValue,
        timestamp,
        results: {
          correctCount,
          totalQuestions: questions.length,
          questionsCheckedCount,
          questions
        },
        syncedAt: new Date().toISOString()
      };

      const docRef = collectionRef.doc(email);
      batch.set(docRef, studentData);
      batchCount++;
      processedCount++;

      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    res.json({
      success: true,
      message: `Đồng bộ thành công dữ liệu của ${processedCount} thí sinh lên Firestore Cloud Database!`,
      processedCount
    });

  } catch (error: any) {
    console.error("Sync database error:", error);
    res.status(500).json({ error: error.message || "Lỗi đồng bộ hóa dữ liệu lên Firestore." });
  }
});

// Student Lookup Endpoint with cloud Firestore database cache syncing support
app.get("/api/student-lookup", async (req, res) => {
  try {
    const emailQuery = req.query.email as string;
    if (!emailQuery) {
      return res.status(400).json({ error: "Vui lòng cung cấp địa chỉ email." });
    }

    const targetEmail = emailQuery.trim().toLowerCase();
    
    // Try querying Firestore first for synchronized real-time lookup
    if (db && isDbHealthy) {
      try {
        const docRef = db.collection("students").doc(targetEmail);
        const doc = await docRef.get();
        if (doc.exists) {
          const cachedData = doc.data() || {};
          console.log(`Cache hit in Firestore for student: ${targetEmail}`);
          return res.json({
            success: true,
            student: {
              email: cachedData.email || targetEmail,
              name: cachedData.name || "Học sinh",
              score: cachedData.score || "",
              timestamp: cachedData.timestamp || "",
            },
            results: cachedData.results || { correctCount: 0, totalQuestions: 0, questionsCheckedCount: 0, questions: [] }
          });
        }
      } catch (err: any) {
        console.error("Firestore cache lookup error, falling back to sheet:", err);
        if (err.message?.includes("PERMISSION_DENIED") || err.code === 7) {
          isDbHealthy = false;
          console.warn("Firestore access denied. Disabling Firestore lookup caching.");
        }
      }
    }

    const config = await getAppConfig();

    // 1. Load Student Responses
    let s1Content = "";
    if (config.directSheet1Data) {
      s1Content = config.directSheet1Data;
    } else if (config.sheet1Url) {
      s1Content = await fetchSheetData(config.sheet1Url);
    } else {
      return res.status(500).json({ error: "Nguồn dữ liệu điểm số chưa được cấu hình." });
    }

    const s1Rows = parseCSV(s1Content);
    if (s1Rows.length < 2) {
      return res.status(404).json({ error: "Danh sách điểm trống hoặc lỗi cấu trúc." });
    }

    const s1Headers = s1Rows[0];
    const { emailIdx, nameIdx, scoreIdx, timestampIdx } = findColumnIndices(s1Headers);

    if (emailIdx === -1) {
      return res.status(500).json({ error: "Không tìm thấy cột Email trong danh sách điểm. Vui lòng liên hệ quản trị viên." });
    }

    // Find student matching email
    let studentRowIndex = -1;
    for (let i = 1; i < s1Rows.length; i++) {
      if (s1Rows[i][emailIdx] && s1Rows[i][emailIdx].trim().toLowerCase() === targetEmail) {
        studentRowIndex = i;
        break;
      }
    }

    if (studentRowIndex === -1) {
      return res.status(404).json({ error: "Không tìm thấy email này trong danh sách kết quả thi. Vui lòng kiểm tra lại." });
    }

    const studentRow = s1Rows[studentRowIndex];

    // 2. Load Correct Answers (Keys)
    let s2Content = "";
    if (config.directSheet2Data) {
      s2Content = config.directSheet2Data;
    } else if (config.sheet2Url) {
      s2Content = await fetchSheetData(config.sheet2Url);
    } else {
      return res.status(500).json({ error: "Nguồn dữ liệu đáp án đúng chưa được cấu hình." });
    }

    const s2Rows = parseCSV(s2Content);
    const keyMap = parseAnswerKeys(s2Rows);

    // 3. Match and build results
    const questions: any[] = [];
    let correctCount = 0;
    let questionsCheckedCount = 0;

    for (let col = 0; col < s1Headers.length; col++) {
      if (col === timestampIdx || col === emailIdx || col === nameIdx || col === scoreIdx) {
        continue;
      }

      const colHeader = s1Headers[col].trim();
      if (!colHeader) continue;

      const studentAns = studentRow[col] ? studentRow[col].trim() : "";

      let matchKey = colHeader;
      const colNumMatch = colHeader.match(/(Câu\s*\d+|\d+)/i);
      if (colNumMatch) {
        const numPart = colNumMatch[1].match(/\d+/);
        matchKey = numPart ? `Câu ${numPart[0]}` : colHeader;
      }

      let correctAns = keyMap.get(matchKey) || "";
      if (!correctAns) {
        for (const [k, v] of keyMap.entries()) {
          const kNormalized = k.toLowerCase().replace(/\s+/g, "");
          const colHeaderNormalized = colHeader.toLowerCase().replace(/\s+/g, "");
          if (colHeaderNormalized.includes(kNormalized) || kNormalized.includes(colHeaderNormalized)) {
            correctAns = v;
            break;
          }
        }
      }

      const isCorrect = correctAns ? isCorrectAnswer(studentAns, correctAns) : null;
      if (isCorrect) {
        correctCount++;
      }
      if (correctAns) {
        questionsCheckedCount++;
      }

      questions.push({
        columnHeader: colHeader,
        matchKey,
        studentAnswer: studentAns,
        correctAnswer: correctAns || "Chưa có đáp án mẫu",
        isCorrect: correctAns ? isCorrect : null
      });
    }

    const matchedScore = scoreIdx !== -1 ? studentRow[scoreIdx].trim() : `${correctCount}/${questionsCheckedCount}`;
    const studentPayload = {
      email: studentRow[emailIdx].trim(),
      name: nameIdx !== -1 ? studentRow[nameIdx].trim() : "Học sinh",
      score: matchedScore,
      timestamp: timestampIdx !== -1 ? studentRow[timestampIdx].trim() : "",
    };

    const resultsPayload = {
      correctCount,
      totalQuestions: questions.length,
      questionsCheckedCount,
      questions
    };

    // Auto cache to Firestore so other instances can lookup instantly!
    if (db && isDbHealthy) {
      try {
        await db.collection("students").doc(targetEmail).set({
          email: studentPayload.email,
          name: studentPayload.name,
          score: studentPayload.score,
          timestamp: studentPayload.timestamp,
          results: resultsPayload,
          syncedAt: new Date().toISOString()
        });
        console.log(`Automatically cached student result for: ${targetEmail}`);
      } catch (cacheErr: any) {
        console.error("Auto caching to Firestore failed:", cacheErr);
        if (cacheErr.message?.includes("PERMISSION_DENIED") || cacheErr.code === 7) {
          isDbHealthy = false;
          console.warn("Firestore access denied. Disabling auto caching.");
        }
      }
    }

    res.json({
      success: true,
      student: studentPayload,
      results: resultsPayload
    });

  } catch (error: any) {
    console.error("Error in /api/student-lookup:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ khi xử lý dữ liệu." });
  }
});

// Serve static assets in production, setup Vite dev server in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
