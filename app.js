import { WARCParser } from 'https://unpkg.com/warcio/dist/warcio.js';
import {LitElement, html, css} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/all/lit-all.min.js';

class WARCAnalyzer extends LitElement {

  static get properties() {
    return {
      recordTypes: {type: Object},
      mediaTypes: {type: Object},
    }
  }

  static styles = css`
    main {
      max-width: 1000px;
      margin-left: auto;
      margin-right: auto;
    }

    .columns {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }

    header {
      font-weight: bold;
      font-size: 20pt;
      margin-bottom: 20px;
    }
  `

  constructor() {
    super();
    this.warcFiles = [];
    this.recordCount = 0;
    this.filesAnalyzed = 0;
    this.recordTypes = {};
    this.mediaTypes = {};
    this.hosts = {};
  }

  render() {
    return html`
      <main>
        <header>warc-analyzer</header>
        <wa-selector @start-load=${this.onStartLoad}></wa-selector>
        <wa-progress 
          .warcFiles=${this.warcFiles} 
          filesAnalyzed=${this.filesAnalyzed}
          recordCount=${this.recordCount}></wa-progress>
        <div class="columns">
          <wa-counts name="WARC Record Types" .counts=${this.recordTypes}></wa-counts>
          <wa-counts name="Hostnames" .counts=${this.hosts}></wa-counts>
          <wa-counts name="Media Types" .counts=${this.mediaTypes}></wa-counts>
        </div>
      </main>
    `;
  }

  onStartLoad(event) {
    this.analyze(event.detail.warcFiles);
  }

  async analyze(warcFiles) {
    this.warcFiles = warcFiles;
    for (const file of warcFiles) {
      await this.analyzeFile(file);
    }
  }

  async analyzeFile(file) {
    this.filesAnalyzed += 1;

    const parser = new WARCParser(file.stream());
    for await (const record of parser) {
      const recordType = record.warcHeaders.headers.get("warc-type");
      const recordTypeCount = this.recordTypes[recordType] || 0;
      this.recordTypes = {
        ...this.recordTypes,
        [recordType]: recordTypeCount + 1
      };

      this.recordCount = this.recordCount + 1;

      if (record.warcHeaders.headers.get("warc-type") == "response") {
        let mediaType = record.httpHeaders.headers.get("content-type", "");
        if (mediaType != null) {
          mediaType = mediaType.split(";")[0].trim();
        }

        this.mediaTypes = {
          ...this.mediaTypes,
          [mediaType]: (this.mediaTypes[mediaType] || 0) + 1
        }

        const url = new URL(record.warcTargetURI);
        const host = url.host;
        this.hosts = {
          ...this.hosts,
          [host]: (this.hosts[host] || 0) + 1
        }
      }
    }

  }

}


class WARCSelector extends LitElement {

  static get properties() {
    return {
      files: {type: Array}
    }
  }

  constructor() {
    super();
    this.files = []
  }

  render() {
    return html`
      <form>

        <input 
          multiple
          type="file"
          accept=".gz,.warc"
          @change="${this.setFiles}" />
      </form>
    `;
  }

  setFiles(e) {
    this.files = Array.from(e.target.files)
    this.dispatchEvent(
      new CustomEvent("start-load", {detail: { warcFiles: this.files }})
    );
  }
}


class Progress extends LitElement {

  static get properties() {
    return {
      warcFiles: {type: Array},
      filesAnalyzed: {type: Number},
      recordCount: {type: Number}
    }
  }

  static styles = css`
    div {
      margin-bottom: 20px;
    }
  `

  constructor() {
    super();
    this.warcFiles = [];
    this.filesAnalyzed = 0;
    this.recordCount = 0;
  }

  render() {
    if (! this.filesAnalyzed > 0) {
      return ''; 
    }

    return html`
      <div>
        ${this.filesAnalyzed} / ${this.warcFiles.length} WARC files analyzed [${this.recordCount} records]
      </div>
    `
  }

}


class Counts extends LitElement {

  static get properties() {
    return {
      counts: {type: Object},
      name: {type: String}
    }
  }

  static styles = css`
    .section-title {
      font-weight: bold;
    }

    section {
      margin-top: 10px;
    }

    td.count {
      text-align: right;
    }
  `

  constructor() {
    super();
    this.counts = {};
  }

  render() {
    if (Object.entries(this.counts).length === 0) return '';

    const keys = Object.keys(this.counts).sort((a, b) => this.counts[b] - this.counts[a]);
    return html`
      <section>
        <div class="section-title">${this.name}</div>
        <table>
          ${keys.map(k => html`<tr><td class="label">${k}</td><td class="count">${this.counts[k]}</td></tr>`)}
        </table>
      </section>
    `
  }

}

customElements.define('warc-analyzer', WARCAnalyzer);
customElements.define('wa-selector', WARCSelector);
customElements.define('wa-progress', Progress);
customElements.define('wa-counts', Counts);
