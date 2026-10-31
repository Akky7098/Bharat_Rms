// Output shape is independent of the report domain and its filters.
function presentation(text) {
 const person= /\b(?:sales\s*persons?|salesmen|salesman|employees?|persons?)\s*[- ]?wise\b|\b(?:by|per|each)\s+(?:sales\s*persons?|salesmen|salesman|employees?)\b/;
 const customer=/\b(?:customers?|company)\s*[- ]?wise\b|\b(?:by|per|each)\s+(?:customers?|company)\b/;
 const groupBy=person.test(text)?'salesperson':customer.test(text)?'customer':null;
 return {groupBy,individual:/\b(individual|individually|separately|personally)\b/.test(text),
 summary:/\b(summary|count|how many|total attendance)\b/.test(text),
 semanticText:text.replace(new RegExp(person.source,'g'),'grouping').replace(new RegExp(customer.source,'g'),'grouping')};
}
module.exports={presentation};
