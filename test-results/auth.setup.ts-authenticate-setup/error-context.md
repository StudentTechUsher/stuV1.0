# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - heading "We couldn’t find that page" [level=1] [ref=e4]
      - paragraph [ref=e5]: The link might be broken or the page may have moved.
      - generic [ref=e6]:
        - link "Go home" [ref=e7] [cursor=pointer]:
          - /url: /
          - img [ref=e8]
          - text: Go home
        - img "404 illustration" [ref=e10]
  - generic [ref=e12]:
    - button "Report an issue" [ref=e13]:
      - img [ref=e14]
      - generic [ref=e23]: Report Issue
    - button "Hide report issue button" [ref=e24]:
      - img [ref=e25]
  - button "Open Next.js Dev Tools" [ref=e32] [cursor=pointer]:
    - img [ref=e33]
  - alert [ref=e36]
```