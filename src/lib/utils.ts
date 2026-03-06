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


/**
 * Parse a human-readable amount to bigint wei
 * @param {string|number} amount - Human readable amount (e.g., "1.5")
 * @param {number} decimals - Token decimals (default 18)
 * @returns {bigint} Amount in wei
 */
export function parseUnits(amount, decimals = 18) {
  if (!amount || amount === '' || amount === '0') return 0n

  const amountStr = amount.toString()
  const [whole, fraction = ''] = amountStr.split('.')

  // Pad or truncate fraction to match decimals
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)

  // Combine whole and fraction parts
  const combined = whole + paddedFraction

  return BigInt(combined)
}

/**
 * Format bigint wei amount to human-readable string
 * @param {bigint|string} value - Amount in wei
 * @param {number} decimals - Token decimals (default 18)
 * @param {number} displayDecimals - Number of decimals to display (default 4)
 * @returns {string} Human readable amount
 */
export function formatUnits(value, decimals = 18, displayDecimals = 4) {
  if (!value || value === 0n || value === '0') return '0'

  const valueStr = value.toString().padStart(decimals + 1, '0')
  const whole = valueStr.slice(0, -decimals) || '0'
  const fraction = valueStr.slice(-decimals)

  // Trim trailing zeros from fraction
  const trimmedFraction = fraction.replace(/0+$/, '')

  if (!trimmedFraction) return whole

  // Limit display decimals
  const displayFraction = trimmedFraction.slice(0, displayDecimals)

  return `${whole}.${displayFraction}`
}

/**
 * Format USD value
 * @param {number|string} value - USD amount
 * @returns {string} Formatted USD amount
 */
export function formatUSD(value) {
  const num = typeof value === 'string' ? parseFloat(value) : value

  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(2)}K`
  }

  return `$${num.toFixed(2)}`
}

/**
 * Format number with commas
 * @param {number|string} value
 * @returns {string}
 */
export function formatNumber(value) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
}


// swap
export function bigIntSqrt(n) {
  // 边界值处理：0或1的平方根就是自身
  if (n < 0n) throw new Error('流动性计算错误：储备量乘积不能为负数');
  if (n === 0n || n === 1n) return n;

  // 二分法求解（BigInt 运算，全程无精度丢失）
  let low = 1n;
  let high = n;
  let result = 0n;

  while (low <= high) {
    const mid = (low + high) / 2n; // BigInt 整数除法
    const midSquared = mid * mid;  // 计算中间值的平方

    if (midSquared === n) {
      // 刚好是完全平方数，直接返回
      return mid;
    } else if (midSquared < n) {
      // 中间值平方小于目标值，记录当前值并往更大方向找
      result = mid;
      low = mid + 1n;
    } else {
      // 中间值平方大于目标值，往更小方向找
      high = mid - 1n;
    }
  }

  // 返回最接近的向下取整结果（满足LP计算精度要求）
  return result;
}


export function calculateLiquidity(reserveA, reserveB, decimals) {
  // 1. 校验储备量不为0（无流动性时返回0）
  if (reserveA === 0n || reserveB === 0n) return '0.00';

  // 2. 计算两种代币储备量的乘积（BigInt 运算）
  const reserveProduct = reserveA * reserveB;

  // 3. 计算平方根（用手写的bigIntSqrt，无依赖）
  const liquidityRaw = bigIntSqrt(reserveProduct);

  // 4. 把BigInt类型的LP原始值转为人类可读数值（纯原生JS处理精度）
  // 原理：10^decimals 是精度系数，比如 18位精度 → 1e18
  const precision = BigInt(10 ** decimals);
  const liquidityHumanNum = Number(liquidityRaw) / Number(precision);

  // 5. 格式化保留2位小数（前端展示用）
  return liquidityHumanNum.toFixed(2);
}