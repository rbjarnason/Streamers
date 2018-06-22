import React from "react";
import { inject, observer } from "mobx-react";
import { OpenVidu } from "openvidu-browser";
// import QueryString from "query-string";
import Input from "antd/lib/input";

import Video from "./Video.Component";
import Message from "../ChatComponent/Chat.Message.Component";

@inject("session", "roomStore")
@observer
class Room extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      messages: []
      // this is only for demo. Not a real chat no one except for message creator can see this.
    };
  }
  inputRef = undefined;

  componentDidMount() {
    window.addEventListener("beforeunload", this.onUnload);
    this.props.roomStore.modelName = this.props.session.email;
  }

  onUnload = event => {
    event.preventDefault();
    if (this.props.roomStore.session) {
      this.props.roomStore.session.disconnect();
      this.props.roomStore.removeSessionId();
    }
    this.props.roomStore.reset();
  };

  componentWillUnmount() {
    if (this.props.roomStore.session) {
      this.props.roomStore.session.disconnect();
      this.props.roomStore.removeSessionId();
    }
    this.props.roomStore.reset();
    window.removeEventListener("beforeunload", this.onUnload);
  }

  render() {
    return (
      <div className="S-room-container conteiner=fluid">
        <div className="S-room-title S-page-title text-center">
          <h1>MY ROOM</h1>
        </div>
        <hr />
        <div className="S-room-video-container container-fluid">
          <div className="row">
            <div className="col-md-8">
              <div className="S-vidoe-wrapper">
                <Video streamManager={this.props.roomStore.publisher} />
              </div>
            </div>
            <div className="col-md-4">
              <div className="S-room-chat-box-container">
                <div className="S-room-chat-box">
                  <div className="S-chat-messages">
                    {this.state.messages.map((msg, index) => (
                      <Message
                        key={index}
                        username={this.props.session.email}
                        message={msg}
                      />
                    ))}
                  </div>
                  <div className="S-chat-input">
                    <Input
                      placeholder="message"
                      ref={ref => (this.inputRef = ref)}
                      onPressEnter={this.sendMessage}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <hr />
          <div className="col-sm">
            <button className="btn btn-primary" onClick={this.startStream}>
              Start My Stream
            </button>
          </div>
        </div>
      </div>
    );
  }

  startStream = e => {
    e.preventDefault();
    const store = this.props.roomStore;
    store.ov = new OpenVidu();
    store.session = store.ov.initSession();

    store.session.on("streamCreated", event => {
      // Subscribe to the Stream to receive it. Second parameter is undefined
      // so OpenVidu doesn't create an HTML video by its own
      let subscriber = store.session.subscribe(event.stream, undefined);
      store.subscribers.push(subscriber);
    });

    store.session.on("streamDestroyed", event => {
      store.deleteSubscriber(event.stream.streamManager);
    });

    if (store.sessionId) {
      store.getToken("PUBLISHER").then(result => {
        if (result) {
          this.connectToSession();
        }
      });
    } else {
      store
        .createSession(`${this.props.session.email}1`)
        .then(res => {
          if (res) {
            store.getToken("PUBLISHER").then(result => {
              if (result) {
                this.connectToSession();
              }
            });
          }
        });
    }
  };

  connectToSession = () => {
    const store = this.props.roomStore;

    store.session
      .connect(
        store.token,
        { name: this.props.session.email, role: "PUBLISHER" }
      )
      .then(() => {
        let publisher = store.ov.initPublisher(undefined, {
          audioSource: undefined, // The source of audio. If undefined default microphone
          videoSource: undefined, // The source of video. If undefined default webcam
          publishAudio: true, // Whether you want to start publishing with your audio unmuted or not
          publishVideo: true, // Whether you want to start publishing with your video enabled or not
          resolution: "1280x720", // The resolution of your video
          frameRate: 30, // The frame rate of your video
          insertMode: "APPEND", // How the video is inserted in the target element 'video-container'
          mirror: true // Whether to mirror your local video or not
        });

        store.publisher = publisher;

        store.session.publish(publisher);

        // this.props.roomStore.mainStreamManager.addVideoElement(this.props.roomStore.videoEl);
      });
  };

  sendMessage = e => {
    const msg = e.target.value;
    if (msg) {
      const messages = [...this.state.messages];
      messages.push(msg);
      this.setState({ messages });

      this.inputRef.setState({ value: undefined });
    }
  };
}

export default Room;