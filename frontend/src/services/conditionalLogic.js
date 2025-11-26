export function evaluateCondition(condition, answers) {
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
      return false;
  }
}

export function shouldShowQuestion(rules, answers) {
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

export function getVisibleQuestions(questions, answers) {
  return questions.filter(question =>
    shouldShowQuestion(question.conditionalRules, answers)
  );
}
