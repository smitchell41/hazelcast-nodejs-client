import * as Promise from 'bluebird';

import ClientConnection = require('./ClientConnection');
import {InvocationService} from './InvocationService';
import ClientMessage = require('../ClientMessage');
import {ClientAuthenticationCodec} from '../codec/ClientAuthenticationCodec';
import HazelcastClient from '../HazelcastClient';

class ConnectionAuthenticator {

    private connection: ClientConnection;
    private client: HazelcastClient;

    constructor(connection: ClientConnection, client: HazelcastClient) {
        this.connection = connection;
        this.client = client;
    }

    authenticate(ownerConnection: boolean): Promise<boolean> {
        var groupConfig = this.client.getConfig().groupConfig;
        var clusterService = this.client.getClusterService();
        var uuid: string = clusterService.uuid;
        var ownerUuid: string = clusterService.ownerUuid;


        var clientMessage = ClientAuthenticationCodec.encodeRequest(
            groupConfig.name, groupConfig.password, uuid, ownerUuid, ownerConnection, 'NodeJS', 1);
        return this.client.getInvocationService()
            .invokeOnConnection(this.connection, clientMessage)
            .then((msg: ClientMessage) => {
                var authResponse = ClientAuthenticationCodec.decodeResponse(msg);
                if (authResponse.status === 0) {
                    this.connection.address = authResponse.address;
                    if (ownerConnection) {
                        clusterService.uuid = authResponse.uuid;
                        clusterService.ownerUuid = authResponse.ownerUuid;
                    }
                    return true;
                } else {
                    return false;
                }
            });
    }
}

export = ConnectionAuthenticator;
