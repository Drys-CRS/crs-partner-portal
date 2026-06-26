export type Solution = {
  name: string;
  category: string;
  tagline: string;
  vendorUrl: string;
  overview: string;
  usps: string[];
  icp: string[];
  comingSoon?: boolean;
};

export const SOLUTIONS: Solution[] = [
  {
    name: "Vectra",
    category: "Network Detection & Response (NDR)",
    tagline: "AI-Powered XDR Platform",
    vendorUrl: "https://www.vectra.ai",
    overview:
      "Vectra is the leader in AI-driven threat detection and response for hybrid and multi-cloud enterprises. Vectra's patented Attack Signal Intelligence™ detects and prioritises threats across public cloud, SaaS, identity, and networks in a single platform. Named a Leader in the 2025 Gartner® Magic Quadrant for NDR — positioned highest for Ability to Execute.",
    usps: [
      "Reduce SIEM costs, detection rule creation and maintenance",
      "Automate analysts' manual tasks and investigation time",
      "Optimise existing investments in EDR, SOAR, and ITSM",
      "Reduce analyst burnout with accurate detection of true positives",
      "Accelerate investigation and response throughput",
      "Build analyst expertise in hunting and defending against advanced attacks",
    ],
    icp: [
      "Medium to large organisations",
      "500+ concurrent IP addresses (average over 30 days)",
      "250+ internal accounts",
      "Organisations with hybrid or multi-cloud environments",
      "SOC teams looking to consolidate tools and reduce alert fatigue",
    ],
  },
  {
    name: "Flare",
    category: "Dark Web Monitoring & Threat Exposure Management",
    tagline: "Your Automated Cyber Reconnaissance Team",
    vendorUrl: "https://flare.io",
    overview:
      "Flare empowers organisations to proactively detect and remediate exposure across the clear and dark web. It scans for leaked credentials, stolen data, and suspicious activity — alerting you before breaches happen. Flare hosts the largest repository of dark and clear web data used by global threat intelligence agencies.",
    usps: [
      "In-depth domain monitoring with screenshots, SSL registration, and favicon updates",
      "Layered GitHub leak detection mapping commits, users, domains, and repositories",
      "Largest dark and clear web data repository across industries",
      "AI Assist: high-level event summary with technical breakdown and remediation guidance",
      "Entra ID response: block profiles with credentials exposed on the dark web",
      "Best-effort take down services for look-alike domains and GitHub repositories",
      "Flexible commitment model with high discount incentives",
    ],
    icp: [
      "Organisations needing proactive external threat exposure management",
      "Companies handling sensitive intellectual property or customer data",
      "Security teams monitoring for compromised employee credentials",
      "Orgs with developer environments requiring GitHub leak monitoring",
    ],
  },
  {
    name: "Aikido",
    category: "Developer Security Platform",
    tagline: "From Code to CI to Cloud — No Nonsense Security",
    vendorUrl: "https://aikido.dev",
    overview:
      "Aikido is a developer-centric security platform that gives developers and security teams an instant overview of all code-to-cloud security issues. It combines 12+ scanning capabilities into one platform, reducing noise by 95% and guiding teams to fix vulnerabilities fast with AI-powered autofixes. ISO 27001 and SOC 2 certified.",
    usps: [
      "Open Source Dependency Scanning (SCA) for known CVEs and risks",
      "Cloud Posture Management (CSPM) across major cloud providers",
      "SAST & DAST scanning — static code and dynamic API/web app testing",
      "Secrets Detection for leaked API keys, passwords, and certificates",
      "Infrastructure as Code (IaC) and Container Image Scanning",
      "AI AutoFix for SAST & IaC issues in a single click",
      "Aikido Attack: autonomous AI agents for audit-grade penetration testing",
    ],
    icp: [
      "Any organisation with an internal development team",
      "Snyk, Orca, or Veracode replacement candidates",
      "DevOps/DevSecOps teams needing consolidated scanning",
      "Organisations seeking automated SOC 2 or ISO 27001 compliance reports",
    ],
  },
  {
    name: "BlueFlag Security",
    category: "SDLC Governance & Security",
    tagline: "Protecting the Software Supply Chain",
    vendorUrl: "https://blueflagsecurity.com",
    overview:
      "BlueFlag Security transforms SDLC security by focusing on and reducing risks posed by overlooked developer and machine identities. Paired with industry-leading code governance and posture management, it provides comprehensive protection against software supply chain attacks. SOC 2 certified.",
    usps: [
      "Automated rightsizing of developer and machine permissions (least privilege)",
      "Strong identity hygiene: deactivate off-boarded users, manage personal access tokens",
      "Early insider threat detection through continuous CI/CD behavioral monitoring",
      "AI/ML-powered Identity Intelligence for accelerated risk mitigation",
      "Unified view across all SDLC attack vectors without blind spots",
      "68% of attacks exploit identity credentials — BlueFlag directly mitigates this",
    ],
    icp: [
      "Mid-to-large enterprises with internal development teams",
      "Companies with DevOps and DevSecOps initiatives",
      "Organisations handling sensitive data or intellectual property",
      "CISOs, Compliance Officers, and Software Development Managers",
    ],
  },
  {
    name: "Strobes Security",
    category: "AI-Driven CTEM Platform",
    tagline: "Unified ASM, PTaaS & Vulnerability Management",
    vendorUrl: "https://www.strobes.co",
    overview:
      "Strobes seamlessly integrates Attack Surface Management (ASM), Penetration Testing as a Service (PTaaS), and Vulnerability Management (VM) into a unified platform. Built from offensive security expertise, it enables proactive risk mitigation and prevents exploitation before it can occur.",
    usps: [
      "Attack Surface Management: continuous scanning across domains, IPs, and assets",
      "Penetration Testing as a Service: on-demand or recurring tests by expert hackers",
      "Risk Based Vulnerability Management with 3D contextual prioritisation",
      "Application Security Posture Management (ASPM)",
      "Private cloud or on-premises deployment options available",
      "Seamless SIEM, SOAR, and ticketing system integrations",
    ],
    icp: [
      "Enterprise organisations (1000+ employees)",
      "CISOs consolidating external and internal risk exposure tools",
      "Organisations with fragmented vulnerability management visibility",
      "Compliance-driven orgs requiring regular penetration testing",
    ],
  },
  {
    name: "Telivy",
    category: "Cyber Security Auditing",
    tagline: "The Industry's Most Comprehensive Audit Tool for MSSPs",
    vendorUrl: "https://www.telivy.com",
    overview:
      "Telivy is the perfect solution for Security and IT MSSPs to audit cyber security attack surfaces at scale. It quantifies risk using financial metrics and ROI, transforming the security conversation from 'hard-to-justify expense' to 'essential investment'.",
    usps: [
      "PII & Data Identification with estimated total value",
      "M365 and Google Workspace security assessment",
      "Credential Analysis and strength/breach analysis",
      "Dark Web Scan and Asset Discovery",
      "Unlimited risk assessment endpoints with 1-click agent removal",
      "Unlimited external scans via Prospecting Module for lead generation",
      "Ongoing Risk Monitoring Endpoints for continuous visibility",
    ],
    icp: [
      "MSSPs delivering cyber security audits at scale",
      "Partners needing lead generation tools with genuine security value",
      "Organisations needing once-off security audits without ongoing costs",
    ],
  },
  {
    name: "SMBsecure",
    category: "Protection & Compliance for SMBs",
    tagline: "All-in-One Managed Security for Small Business",
    vendorUrl: "https://www.smbsecure.com",
    overview:
      "SMBsecure™ is an all-in-one fully managed service to de-risk small businesses with device and email encryption, device lock and kill, phishing defence, cyber awareness training, and proof of encryption for POPIA compliance. Deployable in minutes with no MX record changes required.",
    usps: [
      "PC and mobile device encryption (Windows, Mac, Android, iOS) with POPIA compliance reports",
      "PDF email encryption via Outlook plugin with free SMS password delivery",
      "Multi-factor authentication for PC and Windows Server logons",
      "Cyber awareness training with phishing simulations",
      "Misdirected email protection with recipient and attachment confirmation",
      "Managed DMARC and MTA-STS email domain protection",
      "Cyber Warranty: R1M data breach, R500K cyber extortion, R250K BEC cover",
    ],
    icp: [
      "Small to medium businesses needing POPIA compliance",
      "Organisations without dedicated IT security staff",
      "South African FSPs requiring financial sector compliance",
      "MSSPs delivering managed security to SMB clients",
    ],
  },
  {
    name: "BeachheadSecure",
    category: "Data Security & Encryption",
    tagline: "Protect Your Data with the Power of Encryption",
    vendorUrl: "https://www.beachheadsolutions.com",
    overview:
      "BeachheadSecure enables Data Security through Native Encryption and Access Control for PCs, Macs, phones, tablets, USB drives, and Windows Servers. Proof of encryption is provided for POPIA compliance, with automated RiskResponder™ taking action against recognised threats.",
    usps: [
      "Complete encryption orchestration using native OS encryption (Windows, Mac, Android, iOS)",
      "USB encryption, port blocking, and remote authentication",
      "Automated RiskResponder™: pre-set responses to invalid logons, timeouts, geofence triggers",
      "2FA for Windows Server for domain, local, and third-party accounts",
      "POPIA compliance reports with full admin audit trail",
      "Mobile MDM: location awareness, feature lockdown, device lock and wipe",
    ],
    icp: [
      "SMB to MME needing device encryption for POPIA compliance",
      "Organisations without Microsoft E3/E5 licenses needing advanced data security",
      "Companies with high risk of lost or stolen devices",
      "Organisations needing Windows Server MFA beyond passwords",
    ],
  },
  {
    name: "vRx",
    category: "Strategic Exposure Remediation Platform",
    tagline: "Vulnerability Discovery, Prioritisation & Remediation Unified",
    vendorUrl: "https://www.vrx.net",
    overview:
      "vRx is a comprehensive SaaS solution combining vulnerability discovery, prioritisation, and remediation in a single unified platform. Lightweight agents collect real-time data across Windows, macOS, and Linux, delivering prioritised vulnerabilities and a streamlined path to precise patching.",
    usps: [
      "360-degree asset awareness: real-time inventory across servers, workstations, and cloud",
      "X-TAGS contextual prioritisation: CVE metrics + exploitability indicators + AI context",
      "Built-in patch management for Windows, macOS, and Linux",
      "Auto-Actions automate repetitive remediation tasks",
      "Patchless Protection: runtime controls when a patch is unavailable",
      "Fully SaaS, WFH-friendly, lightweight agent — no infrastructure required",
    ],
    icp: [
      "Organisations with 100+ endpoints",
      "Teams replacing existing VM or patch management tools",
      "IT and security teams with unmanaged vulnerability backlogs",
      "Orgs needing real-time (not point-in-time) vulnerability visibility",
    ],
  },
  {
    name: "VAPT Services",
    category: "Vulnerability Assessment & Penetration Testing",
    tagline: "Find Your Weak Points Before Attackers Do",
    vendorUrl: "https://www.retaliator.co.za",
    overview:
      "CRS offers Vulnerability Assessment and Penetration Testing as an independent third-party service. Available on-demand or as recurring engagements (CAPEX or OPEX), covering internal/external network, web applications, and domain health scanning — with comprehensive remediation reporting.",
    usps: [
      "Whitebox, Blackbox, and Greybox penetration testing",
      "External vulnerability assessments and domain health scanning",
      "Web application scanning",
      "CAPEX (once-off) or OPEX (ongoing subscription) billing flexibility",
      "Comprehensive reports with severity levels and actionable remediation steps",
      "CRS pentesters as an extension of your team",
    ],
    icp: [
      "Medium to large organisations requiring compliance-driven testing",
      "Organisations with web applications",
      "Orgs needing to identify and test security controls (PCI DSS, HIPAA, GDPR, POPIA)",
    ],
  },
  {
    name: "Cyber Risk Essentials",
    category: "Managed Cyber Awareness Program",
    tagline: "Build Your Human Firewall",
    vendorUrl: "https://www.retaliator.co.za",
    overview:
      "80–90% of breaches involve human interaction. The Cyber Risk Essentials Suite converts your most vulnerable point — people — into your strongest line of defense. It combines automated phishing simulations, self-paced training, instructor-led sessions, and executive coaching into a layered managed program.",
    usps: [
      "Randomised phishing simulations every 3–5 weeks",
      "Monthly self-paced online training, continuous for defaulters",
      "Quarterly instructor-led cyber awareness sessions",
      "Executive Lunch-and-Learn: AI exploitation, deepfake deception, boardroom governance",
      "Dark web intelligence monitoring for compromised employee credentials",
      "Automated compliance reporting for insurance providers and regulators",
    ],
    icp: [
      "Any organisation with employees (human firewall focus)",
      "Orgs needing to reduce cyber insurance premiums",
      "Companies with high email communication reliance",
      "Organisations requiring compliance evidence (POPIA, GDPR)",
    ],
  },
  {
    name: "Todyl (Coming Soon)",
    category: "Network Security & SASE",
    tagline: "Simplified, Integrated Cybersecurity for MSSPs",
    vendorUrl: "https://www.todyl.com",
    overview: "Todyl is coming soon to the CRS partner portfolio. Stay tuned for full details.",
    usps: [],
    icp: [],
    comingSoon: true,
  },
  {
    name: "Panorays (Coming Soon)",
    category: "Third-Party Risk Management",
    tagline: "Automated Third-Party Security Risk Management",
    vendorUrl: "https://www.panorays.com",
    overview: "Panorays is coming soon to the CRS partner portfolio. Stay tuned for full details.",
    usps: [],
    icp: [],
    comingSoon: true,
  },
];
