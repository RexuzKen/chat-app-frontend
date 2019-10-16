import { Component, OnInit } from "@angular/core";
import { Client } from "@stomp/stompjs";
import * as SockJS from "sockjs-client";
import { Mensaje } from "../models/mensaje.model";

@Component({
  selector: "app-chat",
  templateUrl: "./chat.component.html",
  styleUrls: ["./chat.component.css"]
})
export class ChatComponent implements OnInit {
  private client: Client;
  conectado: boolean = false;
  mensaje: Mensaje = {
    texto: "",
    fecha: null,
    username: null,
    tipo: null,
    color: null
  };
  mensajes: Mensaje[] = [];

  constructor() {}

  ngOnInit() {
    this.client = new Client();
    this.client.webSocketFactory = () => {
      return new SockJS("http://localhost:8080/chat-websocket");
    };

    this.client.onConnect = frame => {
      console.log("Conectado: " + this.client.connected + " : " + frame);
      this.conectado = true;

      this.mensaje.tipo = "NUEVO_USUARIO";
      this.client.publish({
        destination: "/app/mensaje",
        body: JSON.stringify(this.mensaje)
      });

      this.client.subscribe("/chat/mensaje", e => {
        let mensaje: Mensaje = JSON.parse(e.body) as Mensaje;
        if (
          !this.mensaje.color &&
          mensaje.tipo == "NUEVO_USUARIO" &&
          this.mensaje.username == mensaje.username
        ) {
          this.mensaje.color = mensaje.color;
        }
        this.mensajes.push(mensaje);
      });
    };

    this.client.onDisconnect = frame => {
      console.log("Desconectado: " + !this.client.connected + " : " + frame);
      this.conectado = false;
      this.mensaje.color = null;
    };
  }

  conectarse(): void {
    console.log("Intentando conectarse...");
    this.client.activate();
  }
  desconectarse(): void {
    console.log("Intentando desconectarse...");
    this.client.deactivate();
  }

  enviarMensaje() {
    console.log(this.mensaje);
    this.mensaje.tipo = "MENSAJE";
    this.client.publish({
      destination: "/app/mensaje",
      body: JSON.stringify(this.mensaje)
    });
    this.mensaje.texto = "";
  }
}
