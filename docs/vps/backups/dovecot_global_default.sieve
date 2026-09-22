require ["fileinto"];

# Move spam to Junk folder
if anyof (header :contains "X-Spam-Flag" "YES",
          header :contains "X-Spam-Status" "Yes") {
  fileinto "Junk";
  stop;
}
