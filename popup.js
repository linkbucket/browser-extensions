document.addEventListener("DOMContentLoaded", () => {
  const keyForm = document.getElementById("key-form");
  const urlForm = document.getElementById("url-form");
  const urlInput = document.getElementById("url");
  const resultDiv = document.getElementById("result");
  const resetKeysBtn = document.getElementById("resetKeys");

  // Helper function to validate URL
  const isValidUrl = (urlString) => {
    try {
      const url = new URL(urlString);
      // Optionally, only allow http(s) URLs
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (e) {
      return false;
    }
  };

  // Check for keys and show appropriate form
  chrome.storage.local.get(["accessKeyId", "secretKey"], (data) => {
    if (data.accessKeyId && data.secretKey) {
      keyForm.style.display = "none";
      urlForm.style.display = "block";
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          urlInput.value = tabs[0].url;
        }
      });
    } else {
      keyForm.style.display = "block";
      urlForm.style.display = "none";
    }
  });

  // Handle key form submission
  keyForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const accessKeyId = document.getElementById("accessKeyId").value;
    const secretKey = document.getElementById("secretKey").value;
    if (!accessKeyId || !secretKey) {
      resultDiv.textContent = "Please enter both keys.";
      return;
    }
    chrome.storage.local.set({ accessKeyId, secretKey }, () => {
      keyForm.style.display = "none";
      urlForm.style.display = "block";
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          urlInput.value = tabs[0].url;
        }
      });
      resultDiv.textContent = "";
    });
  });

  // Handle URL form submission with async/await and error/status handling
  urlForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();

    if (!isValidUrl(url)) {
      resultDiv.textContent = "Please enter a valid URL (http or https).";
      return;
    }

    chrome.storage.local.get(["accessKeyId", "secretKey"], async (data) => {
      const accessKeyId = data.accessKeyId;
      const secretKey = data.secretKey;

      resultDiv.textContent = "Saving...";

      try {
        const response = await fetch("https://linkbucket.app/api/v1/urls", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Access-Key-Id": accessKeyId,
            "X-Secret-Key": secretKey
          },
          body: JSON.stringify({ url: { url, user_tag_ids: [] } })
        });

        if (response.ok) {
          resultDiv.textContent = "Success! URL saved.";
        } else {
          const errorText = await response.text();
          resultDiv.textContent = `Error ${response.status}: ${response.statusText}. ${errorText}`;
        }
      } catch (err) {
        resultDiv.textContent = `Network error: ${err.message}`;
      }
    });
  });

  // Handle reset keys
  resetKeysBtn.addEventListener("click", () => {
    chrome.storage.local.remove(["accessKeyId", "secretKey"], () => {
      keyForm.style.display = "block";
      urlForm.style.display = "none";
      resultDiv.textContent = "Keys cleared. Please enter new API keys.";
      document.getElementById("accessKeyId").value = "";
      document.getElementById("secretKey").value = "";
    });
  });
});
