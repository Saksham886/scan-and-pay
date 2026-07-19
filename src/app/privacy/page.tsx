import type { Metadata } from "next";
import { LegalShell, Section } from "@/frontend/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy · Scan&Pay",
  description:
    "How Scan&Pay collects, uses, and protects personal data across its QR ordering software.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy Policy"
      intro="This policy explains, honestly and in plain terms, what data the Scan&Pay software actually collects, why, who it is shared with, and the choices you have."
      lastUpdated="12 June 2026"
    >
      <Section n="1" title="Overview">
        <p>
          Scan&amp;Pay (the &ldquo;Software&rdquo;) is a QR-based ordering
          platform developed and operated by <strong>FortyUp</strong>{" "}
          (the &ldquo;Agency&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). This
          policy covers personal data we handle for two groups of people: café
          owners and staff who use the dashboards, and end customers who scan a
          QR code to place an order.
        </p>
        <p>
          We collect only the data the product genuinely needs to work. We do not
          sell personal data, and we do not run third-party advertising or
          cross-site ad tracking.
        </p>
      </Section>

      <Section n="2" title="Our role: controller vs. processor">
        <ul>
          <li>
            <strong>Café account data</strong>: for the accounts that café
            owners and staff create to use our dashboards, we act as the{" "}
            <strong>data controller</strong>.
          </li>
          <li>
            <strong>End-customer order data</strong>: when an end customer
            places an order at a café, the <strong>café is the data controller /
            data fiduciary</strong> for that data, and we process it on the
            café&rsquo;s behalf as a <strong>data processor</strong>.
          </li>
        </ul>
      </Section>

      <Section n="3" title="Information we collect">
        <p>
          <strong>From café owners and staff (accounts):</strong>
        </p>
        <ul>
          <li>name and email address;</li>
          <li>a securely hashed password (we never store your password in plain text);</li>
          <li>café and branch details, role (owner / staff), and assigned café;</li>
          <li>menu content you upload (item names, descriptions, prices, and images).</li>
        </ul>
        <p>
          <strong>From end customers (placing an order):</strong>
        </p>
        <ul>
          <li>the café and table the order is for, the items ordered, amounts, and order status;</li>
          <li>
            optionally, a name and/or phone number, only if entered, and used for
            order identification and order/payment notifications;
          </li>
          <li>
            payment status returned by the payment gateway. We do{" "}
            <strong>not</strong> collect or store card, UPI, or bank-account
            credentials; those are handled entirely by PhonePe.
          </li>
        </ul>
        <p>
          <strong>Collected automatically:</strong>
        </p>
        <ul>
          <li>
            a session token (cookie) used to keep dashboard users signed in
            (NextAuth, JWT-based);
          </li>
          <li>
            basic technical and server-log data such as IP address, browser and
            device type, and timestamps, used for security and reliability;
          </li>
          <li>
            a theme preference stored locally in your browser (light/dark); this
            stays on your device.
          </li>
        </ul>
      </Section>

      <Section n="4" title="How we use information">
        <ul>
          <li>to display café menus and let end customers place orders;</li>
          <li>to route orders to the right café and update order status in real time;</li>
          <li>to coordinate payment through the payment gateway;</li>
          <li>
            to send order and payment notifications (where a café has enabled
            WhatsApp, SMS, or email notifications);
          </li>
          <li>to provide café owners with analytics about their own orders and revenue;</li>
          <li>to authenticate users, secure accounts, prevent abuse, and debug issues;</li>
          <li>to meet legal, tax, and accounting obligations.</li>
        </ul>
      </Section>

      <Section n="5" title="Cookies and local storage">
        <p>
          We use a single essential session cookie to keep signed-in dashboard
          users authenticated. We store a non-personal theme preference in your
          browser&rsquo;s local storage. We do not use advertising or cross-site
          tracking cookies.
        </p>
      </Section>

      <Section n="6" title="Payments">
        <p>
          Payments are processed by <strong>PhonePe</strong>. When an end
          customer pays, they interact directly with PhonePe&rsquo;s systems;
          their payment-instrument details are handled by PhonePe under its own
          privacy policy and security standards. We receive only the result of
          the transaction (for example, success or failure and a reference),
          not the underlying payment credentials.
        </p>
      </Section>

      <Section n="7" title="Third parties and sub-processors">
        <p>
          We share data only with the service providers needed to run the
          Software, each acting under its own terms. Depending on a café&rsquo;s
          configuration, these may include:
        </p>
        <ul>
          <li><strong>PhonePe</strong>: payment processing;</li>
          <li><strong>Cloudinary</strong>: hosting of uploaded menu images;</li>
          <li><strong>Hosting and database infrastructure</strong>: running the application and storing its data;</li>
          <li>
            <strong>Messaging providers</strong>: such as Meta WhatsApp, Twilio
            (SMS), or Resend (email), used only when a café enables order
            notifications.
          </li>
        </ul>
        <p>
          We do not sell personal data. Beyond these providers, we share data only
          with the relevant café (for its own orders) and where required by law or
          to protect rights and safety.
        </p>
      </Section>

      <Section n="8" title="Data retention">
        <p>
          We retain account and order data for as long as a café&rsquo;s account
          is active and as needed to provide the Software, resolve disputes, and
          comply with legal, tax, and accounting requirements. When data is no
          longer needed, we delete or anonymise it. Cafés may request deletion of
          their account data as described below.
        </p>
      </Section>

      <Section n="9" title="Security">
        <p>
          We take reasonable technical and organisational measures to protect
          data, including hashed passwords, encrypted connections (HTTPS),
          role-based access controls, and tenant isolation between cafés. No
          method of transmission or storage is completely secure, so we cannot
          guarantee absolute security.
        </p>
      </Section>

      <Section n="10" title="Your rights and choices">
        <p>
          Subject to applicable law, including India&rsquo;s Digital Personal Data
          Protection Act, 2023, you may request access to, correction of, or
          deletion of your personal data, and may withdraw consent where
          processing is based on consent.
        </p>
        <ul>
          <li>
            <strong>Café owners and staff</strong>: contact us using the details
            below to exercise these rights over your account data.
          </li>
          <li>
            <strong>End customers</strong>: because the café controls your order
            data, please direct requests to the café you ordered from; we will
            support the café in responding.
          </li>
        </ul>
      </Section>

      <Section n="11" title="Children">
        <p>
          The Software is intended for use by businesses and their customers in
          the ordinary course of dining, and is not directed at children. We do
          not knowingly collect personal data from children in a manner that
          requires separate consent under applicable law.
        </p>
      </Section>

      <Section n="12" title="Data storage and transfers">
        <p>
          Data may be stored and processed on infrastructure operated by our
          hosting and service providers, which may be located in or outside India.
          Where data is transferred, we rely on the protections offered by those
          providers and applicable law.
        </p>
      </Section>

      <Section n="13" title="Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be
          reflected by updating the &ldquo;Last updated&rdquo; date above.
          Continued use of the Software after changes take effect constitutes
          acceptance of the revised policy.
        </p>
      </Section>

      <Section n="14" title="Contact">
        <p>
          For privacy questions or requests, contact{" "}
          <strong>FortyUp</strong> at{" "}
          <a href="mailto:fortyup.partnerships@gmail.com">fortyup.partnerships@gmail.com</a>,{" "}
          <strong>Bengaluru, Karnataka</strong>.
        </p>
      </Section>
    </LegalShell>
  );
}
