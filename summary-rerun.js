// 補上 AI 摘要的「重新摘要」按鈕。
// 這個檔案只做介面增強，不改動原本摘要流程。
document.addEventListener("DOMContentLoaded", () => {
  const runButton = document.querySelector("#summaryRunBtn");
  const output = document.querySelector("#summaryOutput");

  if (!runButton || document.querySelector("#summaryRerunBtn")) {
    return;
  }

  const rerunButton = document.createElement("button");
  rerunButton.id = "summaryRerunBtn";
  rerunButton.type = "button";
  rerunButton.className = "ghost-button";
  rerunButton.textContent = "重新摘要";
  rerunButton.hidden = true;

  rerunButton.addEventListener("click", () => {
    runButton.click();
  });

  runButton.insertAdjacentElement("beforebegin", rerunButton);

  // 只有真的產生摘要後才顯示，避免一打開面板就出現重複按鈕。
  const shouldShowRerun = () => {
    if (!output) {
      return false;
    }

    const text = output.textContent.trim();

    return Boolean(text)
      && text !== "AI 摘要會顯示在這裡"
      && !text.includes("AI 摘要產生中")
      && !text.includes("請選擇筆記")
      && !text.includes("產生摘要失敗");
  };

  const syncRerunButton = () => {
    rerunButton.hidden = !shouldShowRerun();
  };

  if (output) {
    new MutationObserver(syncRerunButton).observe(output, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  runButton.addEventListener("click", () => {
    rerunButton.hidden = true;
  });
});
