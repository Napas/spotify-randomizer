module.exports = class {
    constructor(dynamo, tableName) {
        this.dynamo = dynamo;
        this.tableName = tableName;
    }

    async saveToken(tokenData) {
        console.log('Saving token data to db');

        const requestItems = {};
        requestItems[this.tableName] = [
            {
                PutRequest: {
                    Item: {
                        id: {S: "accessToken"},
                        token: {S: tokenData.body['access_token']},
                        expiresAt: {S: new Date(Date.now() + (tokenData.body['expires_in'] * 1000)).toISOString()},
                    }
                }
            },
        ];

        if (tokenData.refreshToken) {
            requestItems[this.tableName].append(
                {
                    PutRequest: {
                        Item: {
                            id: {S: "refreshToken"},
                            token: {S: tokenData.body['refresh_token']},
                        },
                    },
                },
            )
        }

        return await this
            .dynamo
            .batchWriteItem({RequestItems: requestItems,})
            .promise()
            .then(res => {
                return true;
            });
    }

    async tokenExists() {
        return this
            .dynamo
            .getItem(
                {
                    TableName: this.tableName,
                    ConsistentRead: true,
                    Key: {
                        id: {S: "refreshToken"},
                    }
                }
            )
            .promise()
            .then(resp => {
                return resp.Item && resp.Item.id;
            });
    }

    async getAccessToken() {
        return this.getToken('accessToken')
    }

    async getRefreshToken() {
        return this.getToken('refreshToken')
    }

    async getToken(tokenName) {
        return this
            .dynamo
            .getItem(
                {
                    TableName: this.tableName,
                    ConsistentRead: true,
                    Key: {
                        id: {S: tokenName}
                    }
                }
            )
            .promise()
            .then(resp => {
                if (resp.Item && resp.Item.token && resp.Item.token.S) {
                    return resp.Item.token.S;
                }

                return null;
            })
            .catch(err => {
                console.log(err);

                return null;
            })
    }
};
