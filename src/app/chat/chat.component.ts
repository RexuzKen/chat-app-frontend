import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Mensaje } from '../models/mensaje.model';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit {
  private client: Client;
  private WEBSOCKET_URI = 'http://localhost:8080/chat-websocket';

  conectado: boolean = false;
  mensaje: Mensaje = new Mensaje();
  mensajes: Mensaje[] = [];

  escribiendo: string;
  clientId: string;

  constructor() {
    this.clientId = new Date()
      .getTime()
      .toString(36)
      .substr(2);
  }

  ngOnInit() {
    this.client = new Client();
    this.client.webSocketFactory = () => {
      return new SockJS(this.WEBSOCKET_URI);
    };

    this.client.onConnect = frame => {
      console.log('Conectado: ' + this.client.connected);
      this.conectado = true;

      this.solicitarHistorial();
      this.escucharEscribiendo();
    };

    this.client.onDisconnect = frame => {
      console.log('Desconectado: ' + !this.client.connected);
      this.conectado = false;
      this.mensaje = new Mensaje();
      this.mensajes = [];
    };
  }

  private solicitarHistorial(): void {
    this.client.subscribe(`/chat/historial/${this.clientId}`, e => {
      let historial = JSON.parse(e.body) as Mensaje[];
      historial = historial.reverse();
      this.mensajes = historial;
      this.conectarChat();
    });

    this.client.publish({
      destination: '/app/historial',
      body: this.clientId,
    });
  }

  private conectarChat() {
    this.mensaje.tipo = 'NUEVO_USUARIO';
    this.client.publish({
      destination: '/app/mensaje',
      body: JSON.stringify(this.mensaje),
    });

    this.client.subscribe('/chat/mensaje', e => {
      let mensaje: Mensaje = JSON.parse(e.body) as Mensaje;
      console.log('Mensaje recibido: ' + mensaje.texto);

      if (!this.mensaje.color && mensaje.tipo == 'NUEVO_USUARIO' && this.mensaje.username == mensaje.username) {
        this.mensaje.color = mensaje.color;
      }
      this.mensajes.push(mensaje);
    });
  }

  private escucharEscribiendo() {
    this.client.subscribe('/chat/escribiendo', e => {
      this.escribiendo = e.body;
      setTimeout(() => (this.escribiendo = ''), 3000);
    });
  }

  conectarse(): void {
    this.client.activate();
  }
  desconectarse(): void {
    this.client.deactivate();
  }

  enviarMensaje() {
    this.mensaje.tipo = 'MENSAJE';
    console.log('Enviando mensaje: ' + this.mensaje);
    this.client.publish({
      destination: '/app/mensaje',
      body: JSON.stringify(this.mensaje),
    });
    this.mensaje.texto = '';
  }

  escribiendoMensaje() {
    console.log('Escribiendo mensaje...');
    this.client.publish({
      destination: '/app/escribiendo',
      body: this.mensaje.username,
    });
  }
}
