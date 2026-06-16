const API_KEY = "gsk_....";

  function addMessage(text, sender) {

    const chatBox =
      document.getElementById("chatBox");

    const msg =
      document.createElement("div");

    msg.classList.add(
      "message",
      sender
    );

    msg.textContent = text;

    chatBox.appendChild(msg);

    chatBox.scrollTop =
      chatBox.scrollHeight;

    return msg;
  }

  document
    .getElementById("fileInput")
    .addEventListener(
      "change",
      function () {

        const fileName =
          this.files[0]?.name;

        if (fileName) {

          addMessage(
            "📎 " + fileName,
            "user"
          );

        }

      }
    );

  async function extractText(file) {

    const type =
      file.name
      .split(".")
      .pop()
      .toLowerCase();

    if (type === "pdf") {

      const arrayBuffer =
        await file.arrayBuffer();

      const pdf =
        await pdfjsLib
          .getDocument({
            data: arrayBuffer
          }).promise;

      let text = "";

      for (
        let i = 1;
        i <= Math.min(pdf.numPages, 5);
        i++
      ) {

        const page =
          await pdf.getPage(i);

        const content =
          await page.getTextContent();

        text += content.items
          .map(item => item.str)
          .join(" ");

      }

      return text;
    }


    if (type === "docx") {

      const arrayBuffer =
        await file.arrayBuffer();

      const result =
        await mammoth.convertToHtml({
          arrayBuffer
        });

      const div =
        document.createElement("div");

      div.innerHTML = result.value;

      return (
        div.textContent ||
        div.innerText ||
        ""
      )
      .replace(/\s+/g, " ")
      .trim();
    }

    if (type === "xlsx") {

      const data =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(data, {
          type: "array"
        });

      let text = "";

      workbook.SheetNames.forEach(name => {

        const sheet =
          workbook.Sheets[name];

        text +=
          XLSX.utils.sheet_to_csv(sheet);

      });

      return text;
    }

    return await file.text();
  }

  async function sendMessage() {

    const input =
      document.getElementById("userInput");

    const fileInput =
      document.getElementById("fileInput");

    const userText =
      input.value.trim();

    if (!userText) return;

    addMessage(userText, "user");

    input.value = "";

    const thinkingMsg =
      addMessage(
        "Thinking...",
        "bot"
      );

    try {

      let fileText = "";

      if (fileInput.files[0]) {

        fileText =
          await extractText(
            fileInput.files[0]
          );

        fileText =
          fileText.slice(0, 4000);
      }


      const response =
        await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${API_KEY}`
            },

            body: JSON.stringify({

              model:
                "llama-3.3-70b-versatile",

              messages: [

                {
                  role: "system",

                  content:
                    "Answer only from uploaded document if available."
                },

                {
                  role: "user",

                  content:

                  `Document:
                  ${fileText}

                  Question:
                  ${userText}`
                }

              ]

            })

          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error?.message ||
          "API Error"
        );
      }

      thinkingMsg.remove();

      const reply =

        data.choices?.[0]
        ?.message?.content

        ||

        "No response";

      addMessage(reply, "bot");

    }

    catch (err) {

      thinkingMsg.remove();

      addMessage(
        "Error: " + err.message,
        "bot"
      );

      console.error(err);
    }

  }

  document
    .getElementById("userInput")
    .addEventListener(
      "keypress",
      function (e) {

        if (e.key === "Enter") {
          sendMessage();
        }

      }
    );

