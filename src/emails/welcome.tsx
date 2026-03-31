import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  name: string;
}

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to EventNexus</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>EventNexus</Text>
          </Section>
          
          <Section style={bodySection}>
            <Heading style={h1}>Welcome aboard, {name}!</Heading>
            <Text style={text}>
              We&apos;re thrilled to have you here. EventNexus is the best place to discover, book, and host amazing events with absolute ease. 
            </Text>
            <Text style={text}>
              Ready to dive in? Check out what is happening around you or start publishing your own events.
            </Text>
            
            <Section style={buttonContainer}>
              <Link href="https://eventnexus.app/events" style={button}>
                Explore Events
              </Link>
            </Section>
            
            <Text style={text}>
              If you have any questions, feel free to drop us a message.
            </Text>
          </Section>
          
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} EventNexus Inc. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const main = {
  backgroundColor: "#000000",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  padding: "40px 0",
};

const container = {
  margin: "0 auto",
  padding: "0 20px",
  width: "580px",
  maxWidth: "100%",
};

const header = {
  padding: "20px 0",
};

const logo = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0",
  letterSpacing: "-0.5px",
};

const bodySection = {
  backgroundColor: "#111111",
  border: "1px solid #333333",
  borderRadius: "12px",
  padding: "40px",
};

const h1 = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "32px",
  margin: "0 0 20px 0",
  letterSpacing: "-0.5px",
};

const text = {
  color: "#a1a1aa",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 20px 0",
};

const buttonContainer = {
  padding: "10px 0 30px 0",
};

const button = {
  backgroundColor: "#ffffff",
  borderRadius: "6px",
  color: "#000000",
  fontSize: "14px",
  fontWeight: "500",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const footer = {
  padding: "30px 0",
};

const footerText = {
  color: "#52525b",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "0",
  textAlign: "center" as const,
};
