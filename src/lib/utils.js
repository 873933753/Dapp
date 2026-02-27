import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const handleInputChange = (e) => {
  let inputValue = e.target.value;

  // 彻底移除所有负号（核心：禁止负数）
  inputValue = inputValue.replace(/-/g, "")
  // 1. 移除所有非数字和非小数点的字符
  inputValue = inputValue.replace(/[^0-9.]/g, "");
  
  // 2. 确保只有一个小数点
  const dotIndex = inputValue.indexOf(".");
  if (dotIndex !== -1) {
    inputValue = inputValue.slice(0, dotIndex + 1) + inputValue.slice(dotIndex + 1).replace(/\./g, "");
  }

  // 3. 处理开头的 0（如 00123 → 123，0.123 保留）
  if (inputValue.startsWith("0") && inputValue.length > 1 && !inputValue.startsWith("0.")) {
    inputValue = inputValue.replace(/^0+/, "");
  }

  // 4. 处理以小数点开头（如 .123 → 0.123）
  if (inputValue.startsWith(".")) {
    inputValue = "0" + inputValue;
  }

  // 5. 空值处理（避免显示 0 而非空）
  if (inputValue === "0" && e.target.value === "") {
    inputValue = "";
  }

  return inputValue
};

// 强化：拦截键盘输入负号（包括小键盘减号、快捷键等）
export const handleKeyDown = (e) => {
  // 禁止所有负号相关按键（-、_、小键盘减号）
  const forbiddenKeys = ["-", "_", "Minus"];
  if (forbiddenKeys.includes(e.key) || e.keyCode === 189 || e.keyCode === 109) {
    e.preventDefault(); // 直接阻止按键生效
  }
  // 同时禁止科学计数法相关字符（e/E），避免 1e-3 这类负数形式
  if (["e", "E"].includes(e.key)) {
    e.preventDefault();
  }
};

// 兜底：防止通过粘贴/拖拽等方式传入负数（onPaste 增强）
export const handlePaste = (e) => {
  const pastedText = e.clipboardData.getData("text");
  // 若粘贴内容包含负号，直接阻止粘贴
  if (pastedText.includes("-")) {
    e.preventDefault();
    return;
  }
};


export function debounce(
  fn,
  delay
){
  let timer = null
  
  const debounced = (...args) => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
  
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  
  return debounced
}