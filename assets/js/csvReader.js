export async function loadCSV(path) {
  const response = await fetch(path);
  const csvText = await response.text();
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  });
  return result.data;
}
