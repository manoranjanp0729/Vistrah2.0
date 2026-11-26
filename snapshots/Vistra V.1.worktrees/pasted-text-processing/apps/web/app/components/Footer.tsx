export default function Footer() {
  return (
    <footer className="vFooter">
      <div className="vFooterInner">
        <div>
          <div className="vFooterBrand">VISTRAH</div>
          <p>Managed services. One platform.</p>
        </div>

        <div className="vFooterLinks">
          <a href="/about">About</a>
          <a href="/how-it-works">How It Works</a>
          <a href="/for-business">For Business</a>
          <a href="/refer">Refer & Earn</a>
        </div>

        <div className="vFooterCopy">
          © {new Date().getFullYear()} VISTRAH
        </div>
      </div>
    </footer>
  );
}
