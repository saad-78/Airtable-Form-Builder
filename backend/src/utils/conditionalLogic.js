/**
 * Evaluates a single condition against current answers
 * @param {Object} condition 
 * @param {Object} answers 
 * @returns {boolean}
 */
function evaluateCondition(condition, answers) {
  const { questionKey, operator, value } = condition;
  const answer = answers[questionKey];
  
  if (answer === undefined || answer === null) {
    return operator === 'notEquals';
  }
  
  switch (operator) {
    case 'equals':
      if (Array.isArray(answer)) {
        return answer.includes(value);
      }
      return answer === value;
      
    case 'notEquals':
      if (Array.isArray(answer)) {
        return !answer.includes(value);
      }
      return answer !== value;
      
    case 'contains':
      const answerStr = String(answer || '').toLowerCase();
      const valueStr = String(value || '').toLowerCase();
      return answerStr.includes(valueStr);
      
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Determines if a question should be shown based on its conditional rules
 * @param {Object|null} rules 
 * @param {Object} answers 
 * @returns {boolean}
 */
function shouldShowQuestion(rules, answers) {
  if (!rules || !rules.conditions || rules.conditions.length === 0) {
    return true;
  }
  
  const results = rules.conditions.map(condition => 
    evaluateCondition(condition, answers)
  );
  
  if (rules.logic === 'OR') {
    return results.some(result => result === true);
  }
  
  return results.every(result => result === true);
}

/**
 * Get all visible questions based on current answers
 * @param {Array} questions 
 * @param {Object} answers 
 * @returns {Array} 
 */
function getVisibleQuestions(questions, answers) {
  return questions.filter(question => 
    shouldShowQuestion(question.conditionalRules, answers)
  );
}

module.exports = {
  evaluateCondition,
  shouldShowQuestion,
  getVisibleQuestions
};
