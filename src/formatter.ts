export function formatWynntilsDocument(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) {
    return "";
  }

  const tokens = tokenize(normalized);
  return renderTokens(tokens);
}

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inString = false;
  let stringDelimiter = "";

  const flushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) {
      tokens.push(trimmed);
    }
    current = "";
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      current += char;
      if (char === "\\" && i + 1 < text.length) {
        i++;
        current += text[i];
        continue;
      }
      if (char === stringDelimiter) {
        inString = false;
        stringDelimiter = "";
      }
      continue;
    }

    if (char === "'" || char === "\"") {
      inString = true;
      stringDelimiter = char;
      current += char;
      continue;
    }

    if (char === "{" || char === "}" || char === "(" || char === ")" || char === ";" || char === ",") {
      flushCurrent();
      tokens.push(char);
      continue;
    }

    if (char === "\n" || char === "\t" || char === " ") {
      flushCurrent();
      continue;
    }

    current += char;
  }

  flushCurrent();
  return tokens;
}

function renderTokens(tokens: string[]): string {
  const indentUnit = "  ";
  let indentLevel = 0;
  let output = "";
  let lineStart = true;
  let previousToken = "";
  const contextStack: Array<"function" | "group"> = [];

  const ensureIndent = () => {
    if (lineStart) {
      output += indentUnit.repeat(Math.max(indentLevel, 0));
      lineStart = false;
    }
  };

  const append = (value: string) => {
    ensureIndent();
    output += value;
  };

  const newline = () => {
    output = output.replace(/[ \t]+$/g, "");
    output += "\n";
    lineStart = true;
  };

  for (const token of tokens) {
    switch (token) {
      case "{":
        append("{");
        indentLevel++;
        newline();
        break;
      case "}":
        indentLevel--;
        if (!lineStart) {
          newline();
        }
        append("}");
        if (indentLevel >= 0) {
          newline();
        }
        break;
      case "(":
        append("(");
        if (previousToken.length > 0 && !isDelimiter(previousToken)) {
          contextStack.push("function");
          indentLevel++;
          newline();
        } else {
          contextStack.push("group");
        }
        break;
      case ")":
        if (contextStack[contextStack.length - 1] === "function") {
          indentLevel--;
          if (!lineStart) {
            newline();
          }
        }
        append(")");
        contextStack.pop();
        break;
      case ";":
        append(";");
        if (contextStack.length > 0 && contextStack[contextStack.length - 1] === "function") {
          newline();
        } else {
          append(" ");
        }
        break;
      case ",":
        append(",");
        append(" ");
        break;
      default:
        if (!lineStart && needsSpaceBefore(previousToken, token)) {
          output += " ";
        }
        append(token);
        break;
    }

    previousToken = token;
  }

  return output.trim();
}

function isDelimiter(token: string): boolean {
  return token === "" || token === "{" || token === "}" || token === "(" || token === ")" || token === ";" || token === ",";
}

function needsSpaceBefore(previousToken: string, currentToken: string): boolean {
  if (previousToken === "" || previousToken === "(" || previousToken === "{" || previousToken === ";" || previousToken === ",") {
    return false;
  }
  if (currentToken === ")" || currentToken === "}" || currentToken === ";" || currentToken === ",") {
    return false;
  }
  return true;
}
