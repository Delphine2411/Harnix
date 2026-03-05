import nodemailer from "nodemailer";

export class MailerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailerConfigError";
  }
}

export class MailerAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailerAuthError";
  }
}

const isPlaceholderServer = (value: string) => {
  return value.includes("smtp://user:pass@") || value.includes("votredomaine.com");
};

const getTransporter = () => {
  const emailServer = process.env.EMAIL_SERVER;
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailServer && !isPlaceholderServer(emailServer)) {
    return nodemailer.createTransport(emailServer);
  }

  if (emailHost && emailPort && emailUser && emailPass) {
    return nodemailer.createTransport({
      host: emailHost,
      port: Number(emailPort),
      secure: Number(emailPort) === 465,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  throw new MailerConfigError(
    "Config email invalide. Renseignez EMAIL_SERVER (valide) ou EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASS."
  );
};

export const sendEmail = async (options: nodemailer.SendMailOptions) => {
  const transporter = getTransporter();

  try {
    await transporter.sendMail(options);
  } catch (error: unknown) {
    const nodemailerError = error as { code?: string };
    if (nodemailerError.code === "EAUTH") {
      throw new MailerAuthError(
        "Identifiants SMTP invalides. Avec Gmail, utilisez un mot de passe d'application."
      );
    }
    throw error;
  }
};
