export const roundNumber = (num, digits) => {
  return Math.round(num * digits) / digits
}

// Форматировать числовой инпут, если введена запятая
// Параметры: строка
export const formatNumberInput = (str) => {
  if (str.includes(',')) {
    return Number(str.trim().split(',').join('.'))
  } else {
    return Number(str.trim())
  }
}
