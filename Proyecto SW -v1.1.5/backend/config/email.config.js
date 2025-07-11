const nodemailer = require('nodemailer');

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'phonepalta711@gmail.com',
        pass: 'gcqffpxwdldqvkjp'
    },
    tls: {
        ciphers: 'SSLv3'
    }
});

// Función para enviar correo de contacto
const sendContactEmail = async (contactData) => {
    const { nombre, email, telefono, asunto, mensaje } = contactData;
    
    // Configurar el correo
    const mailOptions = {
        from: 'phonepalta711@gmail.com',
        to: 'phonepalta711@gmail.com',  // Donde quieres recibir los mensajes
        subject: `Nuevo mensaje de contacto - ${asunto}`,
        html: `
            <div style="font-family: 'Caviar Dreams', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFFEFC;">
                <div style="background-color: #FFD72D; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h2 style="color: #3C3833; margin: 0; font-family: 'MADE TOMMY', Arial, sans-serif; font-weight: 700; font-size: 24px;">
                        🐝 Nuevo mensaje de contacto
                    </h2>
                    <p style="color: #3C3833; margin: 10px 0 0 0; font-size: 16px;">
                        Colmenares Saavedra Armijo SPA
                    </p>
                </div>
                
                <div style="background-color: #FFFEFC; padding: 25px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFD72D;">
                        <h3 style="color: #3C3833; margin-top: 0; font-family: 'MADE TOMMY', Arial, sans-serif; font-weight: 600; font-size: 18px;">
                            📋 Información del contacto
                        </h3>
                        
                        <div style="margin: 15px 0;">
                            <p style="margin: 8px 0; color: #3C3833;"><strong style="color: #83572F;">Nombre:</strong> ${nombre}</p>
                            <p style="margin: 8px 0; color: #3C3833;"><strong style="color: #83572F;">Correo electrónico:</strong> <a href="mailto:${email}" style="color: #034B3E; text-decoration: none;">${email}</a></p>
                            ${telefono ? `<p style="margin: 8px 0; color: #3C3833;"><strong style="color: #83572F;">Teléfono:</strong> ${telefono}</p>` : ''}
                            <p style="margin: 8px 0; color: #3C3833;"><strong style="color: #83572F;">Asunto:</strong> ${asunto}</p>
                        </div>
                    </div>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 8px; border: 2px solid #FFD72D; margin: 20px 0;">
                        <h4 style="color: #3C3833; margin-top: 0; font-family: 'MADE TOMMY', Arial, sans-serif; font-weight: 600; font-size: 16px;">
                            💬 Mensaje
                        </h4>
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px;">
                            <p style="margin: 0; line-height: 1.6; color: #3C3833; font-size: 14px;">${mensaje.replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding: 15px; background-color: #3C3833; border-radius: 8px;">
                    <p style="color: #FFFEFC; font-size: 14px; margin: 5px 0;">
                        🐝 Este mensaje fue enviado desde el formulario de contacto
                    </p>
                    <p style="color: #FFD72D; font-size: 12px; margin: 5px 0; font-weight: 600;">
                        Colmenares Saavedra Armijo SPA - Melipilla, Chile
                    </p>
                    <p style="color: #FFFEFC; font-size: 12px; margin: 5px 0;">
                        📅 ${new Date().toLocaleString('es-CL')}
                    </p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Error al enviar correo:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    transporter,
    sendContactEmail
}; 